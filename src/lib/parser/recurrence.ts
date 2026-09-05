import dayjs from 'dayjs';
import type { BusinessDayShift } from './businessDays';
import type { Recur } from './types';

const freqs = {
	D: 'day',
	W: 'week',
	M: 'month',
	Y: 'year',
} as const;

const defaultFrequency = 'M';

export interface ParsedWhen {
	startDate: Date | null;
	recur: Recur | null;
	recurRaw: string;
	endDate: Date | null;
	businessDayShift: BusinessDayShift;
}

export function getRandomId(): string {
	return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase();
}

export function getDate(rawDate: string | null): Date | null {
	if (rawDate === null) {
		return null;
	}
	const upper = rawDate.toUpperCase();
	if (upper.endsWith('-L')) {
		const parts = upper.slice(0, -2).split('-');
		if (parts.length !== 2) return null;
		return dayjs(new Date(+parts[0], +parts[1] - 1, 1))
			.endOf('month')
			.toDate();
	}
	const parts = rawDate.split('-');
	if (parts.length !== 3) return null;
	return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

function stripBusinessDayShift(raw: string): { text: string; shift: BusinessDayShift } {
	if (raw.endsWith('<')) {
		return { text: raw.slice(0, -1), shift: 'prev' };
	}
	if (raw.endsWith('>')) {
		return { text: raw.slice(0, -1), shift: 'next' };
	}
	return { text: raw, shift: null };
}

export function parseRecur(recur: string): Recur | null {
	if (!recur || recur === '') {
		return null;
	}
	const upper = recur.toUpperCase();
	const rmlMatch = /^R([0-9]*)ML$/.exec(upper);
	if (rmlMatch) {
		return {
			freq: 'M',
			multiple: rmlMatch[1] === '' ? 1 : +rmlMatch[1],
			count: null,
			recurRaw: recur,
			lastDayOfMonth: true,
		};
	}
	const regexpRecur = /R([0-9]*)([DWMY]?)([0-9]*)/;
	const match = regexpRecur.exec(upper);
	if (!match) {
		return null;
	}
	const [, multiple, freq, count] = match;
	return {
		freq: (freq === '' ? defaultFrequency : freq) as Recur['freq'],
		multiple: multiple === '' ? 1 : +multiple,
		count: count === '' ? null : +count,
		recurRaw: match[0],
	};
}

export function parseDate(rawDate: string | undefined): ParsedWhen | undefined {
	if (!rawDate) {
		return undefined;
	}
	const normalized = rawDate.replace(/-R/g, ',R');
	const [startRaw, recurPart = '', endPart = ''] = normalized.split(',');
	const { text: recurText, shift: recurShift } = stripBusinessDayShift(recurPart);
	const { text: endText, shift: endShift } = stripBusinessDayShift(endPart);
	const businessDayShift = recurShift ?? endShift;
	const startDate = getDate(startRaw);
	const endDate = endText ? getDate(endText) : null;
	const recur = parseRecur(recurText);
	return {
		startDate,
		recur,
		recurRaw: recurText,
		endDate,
		businessDayShift,
	};
}

export function updateDescRecur(desc: string, recur: Recur, rIndex: number): string {
	return (
		desc.replace(/\(#[0-9]+(\/[0-9]+)?\)/g, '') +
		` (#${rIndex}${recur.count !== null ? `/${recur.count}` : ''})`
	);
}

export function updateDateRecur(date: Date, recur: Recur): Date {
	const current = dayjs(date);
	if (recur.lastDayOfMonth) {
		return current.add(recur.multiple, 'month').endOf('month').toDate();
	}
	if (recur.freq === 'M') {
		const dayOfMonth = current.date();
		const next = current.add(recur.multiple, 'month');
		const clampedDay = Math.min(dayOfMonth, next.daysInMonth());
		return next.date(clampedDay).toDate();
	}
	return current.add(recur.multiple, freqs[recur.freq]).toDate();
}

const typeSortOrder: Record<string, number> = { B: 0, C: 1, D: 2 };

export function sortEntries<T extends { date: Date; type: string; entryOrder?: number }>(
	entries: T[],
): T[] {
	return entries.toSorted((a, b) => {
		const byDate = a.date.valueOf() - b.date.valueOf();
		if (byDate !== 0) return byDate;

		const byType =
			(typeSortOrder[a.type] ?? 99) - (typeSortOrder[b.type] ?? 99);
		if (byType !== 0) return byType;

		return (a.entryOrder ?? 0) - (b.entryOrder ?? 0);
	});
}

export function getBalanceFlag(bal: number, balanceFlags: import('./types').BalanceFlags): string {
	let balanceFlag = '';
	for (const [flag, threshold] of Object.entries(balanceFlags.below)) {
		if (balanceFlag === '' && bal < threshold) {
			balanceFlag = flag;
		}
	}
	for (const [flag, threshold] of Object.entries(balanceFlags.above)) {
		if (balanceFlag === '' && bal > threshold) {
			balanceFlag = flag;
		}
	}
	return balanceFlag;
}
