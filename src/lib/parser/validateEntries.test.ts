import { describe, expect, it } from 'vitest';
import { validateRawEntries } from './validateEntries';

describe('validateRawEntries', () => {
	it('accepts last-day-of-month dates', () => {
		expect(validateRawEntries('D|2026-01-L,RML|1200|Mortgage')).toEqual([]);
	});

	it('flags a junk date', () => {
		expect(validateRawEntries('D|sometime|10|Snack')[0]?.message).toMatch(/Invalid date/);
	});

	it('accepts a well-formed occurrence override', () => {
		expect(validateRawEntries('D|2026-04-03,RW|80|Groceries|#5=2026-05-08:65')).toEqual([]);
	});

	it('accepts pending occurrence overrides', () => {
		expect(validateRawEntries('D|2026-09-15,R|500|Rent|#1=pending')).toEqual([]);
		expect(validateRawEntries('D|2026-04-03,RW|80|Groceries|#5=65+pending')).toEqual([]);
		expect(validateRawEntries('D|2026-04-03,RW|80|Groceries|#5=2026-05-08:65+pending')).toEqual([]);
	});

	it('flags a junk occurrence override', () => {
		expect(validateRawEntries('D|2026-09-15,R|500|Rent|#1=later')[0]?.message).toMatch(
			/Invalid occurrence override/,
		);
	});
});
