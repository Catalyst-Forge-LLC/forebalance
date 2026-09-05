import { describe, expect, it } from 'vitest';
import {
	applyBusinessDayShift,
	isBusinessDay,
	isFederalHoliday,
} from './businessDays';

describe('isFederalHoliday', () => {
	it('recognizes Independence Day 2026 (Saturday, observed Friday)', () => {
		expect(isFederalHoliday(new Date(2026, 6, 3))).toBe(true);
		expect(isFederalHoliday(new Date(2026, 6, 4))).toBe(false);
	});

	it('recognizes Thanksgiving 2026', () => {
		expect(isFederalHoliday(new Date(2026, 10, 26))).toBe(true);
	});
});

describe('applyBusinessDayShift', () => {
	it('shifts Saturday rent to previous Friday with R<', () => {
		const sat = new Date(2026, 8, 5);
		expect(sat.getDay()).toBe(6);
		const shifted = applyBusinessDayShift(sat, 'prev', false);
		expect(shifted.getDay()).toBe(5);
		expect(shifted.getDate()).toBe(4);
	});

	it('shifts Sunday to next Monday with R>', () => {
		const sun = new Date(2026, 8, 6);
		const shifted = applyBusinessDayShift(sun, 'next', false);
		expect(shifted.getDay()).toBe(1);
		expect(shifted.getDate()).toBe(7);
	});

	it('skips federal holidays when enabled', () => {
		const july3 = new Date(2026, 6, 3);
		expect(isBusinessDay(july3, true)).toBe(false);
		const shifted = applyBusinessDayShift(new Date(2026, 6, 4), 'prev', true);
		expect(shifted.getMonth()).toBe(6);
		expect(shifted.getDate()).toBe(2);
	});
});
