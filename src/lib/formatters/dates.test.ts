import { describe, expect, it } from 'vitest';
import { localIsoDate } from './dates';

describe('localIsoDate', () => {
	it('uses the local calendar day, not UTC', () => {
		expect(localIsoDate(new Date(2026, 8, 1))).toBe('2026-09-01');
	});
});
