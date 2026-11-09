import { readSourceLines } from './sourceLines';
import { datedValue, latestDated } from './lineExtras';
import { localIsoDate } from '#lib/formatters/dates.ts';

export function bulkPaymentRows(raw: string, today = localIsoDate()) {
  const lines = readSourceLines(raw);
  const account = (line: (typeof lines)[number]) => (line.accountSuffix || line.extras.accountSlot || '').toUpperCase();
  return lines
    .filter((line) => line.kind === 'entry' && line.type === 'D' && !line.disabled)
    .map((line) => {
      const key = account(line);
      const shared = !!key && lines.some((other) => other.index !== line.index && other.kind === 'entry' && !other.disabled && account(other) === key);
      return {
        index: line.index,
        name: line.desc || 'Untitled debit',
        category: line.extras.categoryId || 'unfiled',
        account: key,
        balance: String(line.extras.dated?.findLast((v) => v.kind === 'debt' && v.date === today)?.value ?? ''),
        payment: String(latestDated(line.extras.dated, 'pay', today)?.value ?? line.amount),
        strategy: line.extras.strategy || 'fixed',
        balanceEditable: !!key && !shared,
        shared,
      };
    });
}

export type BulkRow = ReturnType<typeof bulkPaymentRows>[number];
export interface BulkDraft {
  row: BulkRow;
  balance: string;
  payment: string;
}
export const changed = (d: BulkDraft) => d.balance !== d.row.balance || d.payment !== d.row.payment;

function valid(value: string, percent = false) {
  return /^\d+(\.\d+)?$/.test(value.trim()) && Number.isFinite(Number(value)) && (!percent || Number(value) <= 100);
}

/** Append or correct dated updates; preserve the historical base fields. Keep comments, overrides and all other source text verbatim. */
export function applyBulkPayments(raw: string, drafts: BulkDraft[], today = localIsoDate()): string {
  const lines = raw.split('\n');
  for (const { row, balance, payment } of drafts.filter(changed)) {
    const cr = lines[row.index].endsWith('\r') ? '\r' : '';
    const fields = lines[row.index].replace(/\r$/, '').split('|');
    function setDated(kind: 'debt' | 'pay', value: string) {
      const idx = fields.findIndex((field, i) => {
        const v = i >= 4 && datedValue(field);
        return v && v.kind === kind && v.date === today;
      });
      const token = kind + '@' + today + '=' + value.trim();
      if (idx < 0) fields.push(token);
      else fields[idx] = token;
    }
    if (balance !== row.balance) {
      if (!row.balanceEditable || !valid(balance)) throw Error(row.name + ': enter a nonnegative balance.');
      setDated('debt', balance);
    }
    if (payment !== row.payment) {
      if (!valid(payment, row.strategy === 'pct'))
        throw Error(row.name + (row.strategy === 'pct' ? ': enter a percentage from 0 to 100.' : ': enter a nonnegative payment.'));
      setDated('pay', payment);
    }
    lines[row.index] = fields.join('|') + cr;
  }
  return lines.join('\n');
}
