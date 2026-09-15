import { describe, expect, it } from 'vitest';
import { localFileStamp, localIsoDate } from './dates';

describe('localIsoDate', () => {
	it('uses the local calendar day, not UTC', () => {
		expect(localIsoDate(new Date(2026, 8, 1))).toBe('2026-09-01');
	});
});

describe('localFileStamp', () => {
	it('appends local time without colons', () => {
		expect(localFileStamp(new Date(2026, 8, 15, 16, 32, 5))).toBe('2026-09-15-163205');
	});
});
