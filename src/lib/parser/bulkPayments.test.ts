import { parseEntries } from './parseEntries';
import { describe, it, expect } from 'vitest';
import { bulkPaymentRows, applyBulkPayments } from './bulkPayments';

describe('category balance and payment updates', () => {
  const source = [
    '--- Keep this comment',
    'B-main-main|2026-11-01|2500|Checking',
    'D-VISA|2026-11-02,R|80|Visa|VISA|1200|20|fixed|||debt|keep|extra=25|autopay|#2=75',
    'D-MC|2026-11-03,R|5|Mastercard|MC|900|15|pct|||debt',
    '!D-MC|2026-11-04|10|Disabled',
    'D|2026-11-05|30|Food',
    '',
  ].join('\r\n');
  it('changes only the requested fields, retaining overrides, strategy, notes, line endings, and unrelated lines', () => {
    const [visa, mc] = bulkPaymentRows(source);
    const result = applyBulkPayments(
      source,
      [
        { row: visa, balance: '980', payment: '85' },
        { row: mc, balance: '720', payment: '5' },
      ],
      '2026-11-08',
    );
    expect(result).toBe(source.replace('|#2=75', '|#2=75|debt@2026-11-08=980|pay@2026-11-08=85').replace('|pct|||debt', '|pct|||debt|debt@2026-11-08=720'));
  });
  it('rejects invalid payments and does not treat a shared balance as a separate debt', () => {
    const rows = bulkPaymentRows(source + 'D-VISA|2026-12-01|20|Second Visa payment');
    expect(rows[0].balanceEditable).toBe(false);
    expect(() => applyBulkPayments(source, [{ row: rows[1], balance: '0', payment: '110' }])).toThrow(/percentage/);
    expect(() => applyBulkPayments(source, [{ row: rows[0], balance: '8', payment: '2' }])).toThrow();
  });
});

describe('dated debt balances', () => {
  const flags = { above: { goal: 3000 }, below: { uncomfortable: 500, low: 100, negative: 0 } };
  const source = 'B-CH-main|2026-11-01|5000|Checking\nD-VISA|2026-11-07,RD|100|Visa|VISA|1000|0';
  function calculate(text: string) {
    return parseEntries(text, 1, flags)[0]!;
  }
  it('preserves history and same-day payments; resets the debt without moving checking, then applies the new payment', () => {
    const [row] = bulkPaymentRows(source, '2026-11-08');
    const next = applyBulkPayments(source, [{ row, balance: '600', payment: '75' }], '2026-11-08');
    const before = calculate(source),
      after = calculate(next);
    expect(after.VISA.slice(0, 2).map((e) => e.balance)).toEqual([900, 800]);
    expect(after.VISA[2]).toMatchObject({ debtReset: true, balance: 600, mainBalance: 4800 });
    expect(after.VISA[3]).toMatchObject({ amount: 75, balance: 525, mainBalance: 4725 });
    expect(after.CH.slice(0, 3).map((e) => e.mainBalance)).toEqual(before.CH.slice(0, 3).map((e) => e.mainBalance));
    expect(after.CH.some((e) => e.debtReset)).toBe(false);
    const [again] = bulkPaymentRows(next, '2026-11-08');
    const corrected = applyBulkPayments(next, [{ row: again, balance: '0', payment: '75' }], '2026-11-08');
    expect(calculate(corrected).VISA.filter((e) => e.debtReset)).toHaveLength(1);
    expect(calculate(corrected).VISA[3]).toMatchObject({ amount: 0, balance: 0 });
  });
  it('keeps the existing payment on a balance-only reset and does not reset on a payment-only update', () => {
    const [row] = bulkPaymentRows(source, '2026-11-08');
    expect(calculate(applyBulkPayments(source, [{ row, balance: '600', payment: row.payment }], '2026-11-08')).VISA[3]).toMatchObject({
      amount: 100,
      balance: 500,
    });
    const payments = calculate(applyBulkPayments(source, [{ row, balance: row.balance, payment: '75' }], '2026-11-08')).VISA;
    expect(payments.some((e) => e.debtReset)).toBe(false);
    expect(payments[2]).toMatchObject({ amount: 75, balance: 725 });
  });
});
