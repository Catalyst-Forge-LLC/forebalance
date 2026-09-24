import { describe, expect, it } from 'vitest';
import { evaluateMathJson, MathJsonError } from './mathjson';

describe('evaluateMathJson', () => {
	it('computes one month of interest from balance and APR', () => {
		const value = evaluateMathJson(['Multiply', 'balance', ['Divide', 'apr', 1200]], {
			balance: 2800,
			apr: 19.99,
		});
		expect(value).toBeCloseTo(46.64333, 4);
	});

	it('rejects a call to eval', () => {
		expect(() => evaluateMathJson(['Call', 'eval', 'alert(1)'])).toThrow(MathJsonError);
		expect(() => evaluateMathJson(['Call', 'eval', 'alert(1)'])).toThrow(/not allowed/);
	});

	it('rejects an unknown symbol', () => {
		expect(() => evaluateMathJson(['Add', 'balance', 1], {})).toThrow(/Unknown symbol/);
	});
});
