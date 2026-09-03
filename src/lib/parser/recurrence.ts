import dayjs from 'dayjs';
import type { Recur } from './types';

const freqs = {
	D: 'day',
	W: 'week',
	M: 'month',
	Y: 'year',
} as const;

const defaultFrequency = 'M';

export function getRandomId(): string {
	return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).toUpperCase();
}

export function getDate(rawDate: string | null): Date | null {
	if (rawDate === null) {
		return null;
	}
	const parts = rawDate.split('-');
	return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

export function parseRecur(recur: string): Recur | null {
	if (!recur || recur === '') {
		return null;
	}
	const regexpRecur = /R([0-9]*)([DWMY]?)([0-9]*)/;
	const match = regexpRecur.exec(recur.toUpperCase());
	if (!match) {
		return null;
	}
	const [, multiple, freq, count] = match;
	return {
		freq: (freq === '' ? 'M' : freq) as Recur['freq'],
		multiple: multiple === '' ? 1 : +multiple,
		count: count === '' ? null : +count,
		recurRaw: match[0],
	};
}

export function parseDate(rawDate: string | undefined): [Date | null, Recur | null, string, Date | null] | undefined {
	if (!rawDate) {
		return undefined;
	}
	const normalized = rawDate.replace(/-R/g, ',R');
	const [startRaw, recur = '', endRaw = ''] = normalized.split(',');
	const startDate = getDate(startRaw);
	const endDate = endRaw ? getDate(endRaw) : null;
	return [startDate, parseRecur(recur), recur, endDate];
}

export function updateDescRecur(desc: string, recur: Recur, rIndex: number): string {
	return (
		desc.replace(/\(#[0-9]+(\/[0-9]+)?\)/g, '') +
		` (#${rIndex}${recur.count !== null ? `/${recur.count}` : ''})`
	);
}

export function updateDateRecur(date: Date, recur: Recur): Date {
	const current = dayjs(date);
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
