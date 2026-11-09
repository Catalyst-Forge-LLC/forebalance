import { describe, it, expect } from 'vitest';
import { planMerge, applyMerge } from './scenarioMerge';
describe('merge fork into original', () => {
  it('applies selected edits without reverting adjacent parent edits or adding skipped rows', () => {
    const base = 'Checking\nRent 100\nPay 500',
      original = 'Checking\r\nRent 120\r\nPay 500',
      fork = 'Checking\nRent 100\nPay 600\nBooks';
    const choices = planMerge(base, original, fork);
    expect(choices.every((c) => !c.conflict)).toBe(true);
    expect(
      applyMerge(
        original,
        choices,
        choices.map((_, i) => i),
      ),
    ).toBe('Checking\r\nRent 120\r\nPay 600\r\nBooks');
    expect(applyMerge(original, choices, [])).toBe(original);
  });
  it('requires review when the fork deletes an edited row or both insert in one gap', () => {
    const choices = planMerge('A\nB\nC', 'A\nbill revised\nC\nOriginal only', 'A\nC\nFork only');
    expect(choices.map((c) => c.conflict)).toEqual([true, true]);
    expect(applyMerge('A\nbill revised\nC\nOriginal only', choices, [0])).toBe('A\nC\nOriginal only');
  });
  it('keeps duplicate entries, blank lines, comments and the final newline', () => {
    const p = '--- bills\r\nA\r\nA\r\n\r\nZ\r\n',
      f = p.replace('A\r\nA', 'A\r\nB');
    const c = planMerge(p, p, f);
    expect(applyMerge(p, c, [0])).toBe(f);
    expect(planMerge(p, f, f)).toEqual([]);
  });
  it('separates a payment edit from an adjacent new bill', () => {
    const p = 'D|today|100|Rent',
      f = 'D|today|110|Rent\nD|tomorrow|50|Books';
    const c = planMerge(p, p, f);
    expect(applyMerge(p, c, [0])).toBe('D|today|110|Rent');
    expect(applyMerge(p, c, [1])).toBe(p + '\nD|tomorrow|50|Books');
  });
  it('lets individual new entries from the same gap be selected', () => {
    const c = planMerge('A', 'A', 'A\nB\nC');
    expect(applyMerge('A', c, [1])).toBe('A\nC');
  });
  it('treats older forks as explicit choices and accepts an empty ancestor', () => {
    expect(planMerge(undefined, 'parent', 'fork')[0].conflict).toBe(true);
    expect(planMerge('', '', 'fork')[0].conflict).toBe(false);
  });
});
