import dayjs from 'dayjs';

export type BusinessDayShift = 'next' | 'prev' | null;

const holidayCache = new Map<number, Set<string>>();

function dateKey(d: dayjs.Dayjs): string {
	return d.format('YYYY-MM-DD');
}

/** Observed federal holiday: Sat → Fri, Sun → Mon. */
function observeFixedHoliday(year: number, month: number, day: number): dayjs.Dayjs {
	const d = dayjs(new Date(year, month - 1, day));
	const dow = d.day();
	if (dow === 6) return d.subtract(1, 'day');
	if (dow === 0) return d.add(1, 'day');
	return d;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): dayjs.Dayjs {
	let d = dayjs(new Date(year, month - 1, 1));
	while (d.day() !== weekday) {
		d = d.add(1, 'day');
	}
	return d.add((n - 1) * 7, 'day');
}

function lastWeekday(year: number, month: number, weekday: number): dayjs.Dayjs {
	let d = dayjs(new Date(year, month, 0));
	while (d.day() !== weekday) {
		d = d.subtract(1, 'day');
	}
	return d;
}

function federalHolidaysForYear(year: number): Set<string> {
	const cached = holidayCache.get(year);
	if (cached) return cached;

	const keys = new Set<string>();
	const add = (d: dayjs.Dayjs) => keys.add(dateKey(d));

	add(observeFixedHoliday(year, 1, 1));
	add(nthWeekday(year, 1, 1, 3));
	add(nthWeekday(year, 2, 1, 3));
	add(lastWeekday(year, 5, 1));
	add(observeFixedHoliday(year, 6, 19));
	add(observeFixedHoliday(year, 7, 4));
	add(nthWeekday(year, 9, 1, 1));
	add(nthWeekday(year, 10, 1, 2));
	add(observeFixedHoliday(year, 11, 11));
	add(nthWeekday(year, 11, 4, 4));
	add(observeFixedHoliday(year, 12, 25));

	holidayCache.set(year, keys);
	return keys;
}

export function isWeekend(date: Date): boolean {
	const dow = date.getDay();
	return dow === 0 || dow === 6;
}

export function isFederalHoliday(date: Date): boolean {
	return federalHolidaysForYear(date.getFullYear()).has(dateKey(dayjs(date)));
}

export function isBusinessDay(date: Date, useFederalHolidays: boolean): boolean {
	if (isWeekend(date)) return false;
	if (useFederalHolidays && isFederalHoliday(date)) return false;
	return true;
}

export function applyBusinessDayShift(
	date: Date,
	shift: BusinessDayShift,
	useFederalHolidays: boolean,
): Date {
	if (!shift) return date;
	let d = dayjs(date);
	const step = shift === 'next' ? 1 : -1;
	while (!isBusinessDay(d.toDate(), useFederalHolidays)) {
		d = d.add(step, 'day');
	}
	return d.toDate();
}
