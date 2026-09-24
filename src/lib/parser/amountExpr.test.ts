import { describe, expect, it } from 'vitest';
import { evaluateAmount } from './amountExpr';

describe('evaluateAmount', () => {
	it('keeps a plain number and evaluates arithmetic', () => {
		expect(evaluateAmount('4350')).toBe(4350);
		expect(evaluateAmount('1000+250')).toBe(1250);
		expect(evaluateAmount('(100+50)*2')).toBe(300);
		expect(evaluateAmount('rent')).toBeNull();
	});
});
