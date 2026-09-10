import { describe, expect, it } from 'vitest';
import { validateRawEntries } from './validateEntries';

describe('validateRawEntries', () => {
	it('accepts last-day-of-month dates', () => {
		expect(validateRawEntries('D|2026-01-L,RML|1200|Mortgage')).toEqual([]);
	});

	it('flags a junk date', () => {
		expect(validateRawEntries('D|sometime|10|Snack')[0]?.message).toMatch(/Invalid date/);
	});
});
