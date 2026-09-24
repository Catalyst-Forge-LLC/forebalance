import { describe, expect, it } from 'vitest';
import { readWhenForm, writeWhenForm } from './whenForm';

describe('whenForm', () => {
	it('reads a one-time date and a monthly business-day rent', () => {
		expect(readWhenForm('2026-09-01')).toMatchObject({ repeat: 'once', date: '2026-09-01', raw: false });
		const rent = readWhenForm('2026-09-05,R<');
		expect(rent).toMatchObject({ repeat: 'M', every: 1, shift: '<', lastDay: false });
		expect(writeWhenForm(rent)).toBe('2026-09-05,R<');
	});

	it('keeps every-two-weeks, a counted series, and last day of the month', () => {
		expect(writeWhenForm(readWhenForm('2026-02-01,R2W'))).toBe('2026-02-01,R2W');
		expect(writeWhenForm(readWhenForm('2026-02-01,RW5'))).toBe('2026-02-01,RW5');
		expect(writeWhenForm(readWhenForm('2026-01-L,RML'))).toBe('2026-01-L,RML');
		expect(writeWhenForm(readWhenForm('2026-02-10,R2D,2026-04-10'))).toBe('2026-02-10,R2D,2026-04-10');
		expect(writeWhenForm(readWhenForm('2026-04-25,R3'))).toBe('2026-04-25,R3');
		expect(writeWhenForm(readWhenForm('2026-03-15,R3M'))).toBe('2026-03-15,R3M');
		expect(writeWhenForm(readWhenForm('2026-03-15,R3M3'))).toBe('2026-03-15,R3M3');
		expect(readWhenForm('2026-04-25,R3')).toMatchObject({ repeat: 'M', every: 1, times: '3' });
		expect(readWhenForm('2026-03-15,R3M3')).toMatchObject({ repeat: 'M', every: 3, times: '3' });
	});
});