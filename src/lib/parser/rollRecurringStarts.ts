import dayjs from 'dayjs';
import { isLastDayToken, localIsoDate } from '$lib/formatters/dates';
import { setWhenStart, splitLineFields, writeLine } from '$lib/parser/occurrenceEdit';
import { dayKey, parseDate, updateDateRecur } from '$lib/parser/recurrence';
import type { OccurrenceOverride, Recur } from '$lib/parser/types';
import { isEntryLineDisabled, stripDisabledPrefix } from '$lib/parser/validateEntries';

const MAX_WALK = 20_000;

export interface RecurringStartChange {
	desc: string;
	from: string;
	to: string;
}

export interface RecurringStartRoll {
	raw: string;
	changed: number;
	examples: RecurringStartChange[];
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatStart(date: Date, lastDayToken: boolean): string {
	if (lastDayToken) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		return `${year}-${month}-L`;
	}
	return localIsoDate(date);
}

function monthDiff(from: Date, to: Date): number {
	return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/** Add months from the original start so day-of-month (e.g. the 30th) is restored after short months. */
function addCalendarMonths(start: Date, months: number, lastDay: boolean): Date {
	const shifted = dayjs(start).add(months, 'month');
	if (lastDay) return shifted.endOf('month').toDate();
	return shifted.date(Math.min(start.getDate(), shifted.daysInMonth())).toDate();
}

function occurrenceAt(start: Date, recur: Recur, n: number): Date {
	let date = start;
	for (let i = 1; i < n && i < MAX_WALK; i++) {
		date = updateDateRecur(date, recur);
	}
	return date;
}

function occurrenceIndexOn(start: Date, recur: Recur, target: Date): number {
	let date = start;
	let n = 1;
	while (dayKey(date) < dayKey(target) && n < MAX_WALK) {
		date = updateDateRecur(date, recur);
		n += 1;
	}
	return n;
}

function lastCalendarOnOrBefore(
	start: Date,
	stepMonths: number,
	lastDay: boolean,
	anchor: Date,
): { date: Date; steps: number } | null {
	if (dayKey(start) > dayKey(anchor)) return null;
	let steps = Math.max(0, Math.floor(monthDiff(start, anchor) / stepMonths));
	let date = addCalendarMonths(start, steps * stepMonths, lastDay);
	while (steps > 0 && dayKey(date) > dayKey(anchor)) {
		steps -= 1;
		date = addCalendarMonths(start, steps * stepMonths, lastDay);
	}
	while (true) {
		const next = addCalendarMonths(start, (steps + 1) * stepMonths, lastDay);
		if (dayKey(next) <= dayKey(anchor)) {
			steps += 1;
			date = next;
		} else {
			break;
		}
	}
	return { date, steps };
}

function lastWalkedOnOrBefore(start: Date, recur: Recur, anchor: Date): Date | null {
	if (dayKey(start) > dayKey(anchor)) return null;
	let date = start;
	for (let i = 0; i < MAX_WALK; i++) {
		const next = updateDateRecur(date, recur);
		if (dayKey(next) > dayKey(anchor)) return date;
		date = next;
	}
	return date;
}

function walkedBefore(start: Date, recur: Recur, current: Date): Date | null {
	if (dayKey(start) >= dayKey(current)) return null;
	let prev = start;
	let date = updateDateRecur(start, recur);
	for (let i = 0; i < MAX_WALK; i++) {
		if (dayKey(date) >= dayKey(current)) return prev;
		prev = date;
		date = updateDateRecur(date, recur);
	}
	return prev;
}

/** Last occurrence on or before the anchor (calendar months/years; walked days/weeks). */
export function lastOccurrenceOnOrBefore(start: Date, recur: Recur, anchor: Date): Date | null {
	if (recur.freq === 'M') {
		return lastCalendarOnOrBefore(start, recur.multiple, Boolean(recur.lastDayOfMonth), anchor)?.date ?? null;
	}
	if (recur.freq === 'Y') {
		return lastCalendarOnOrBefore(start, recur.multiple * 12, Boolean(recur.lastDayOfMonth), anchor)?.date ?? null;
	}
	return lastWalkedOnOrBefore(start, recur, anchor);
}

/** One interval before the last occurrence on or before the anchor. */
export function rollStartDate(start: Date, recur: Recur, anchor: Date): Date | null {
	if (recur.freq === 'M' || recur.freq === 'Y') {
		const step = recur.freq === 'Y' ? recur.multiple * 12 : recur.multiple;
		const last = lastCalendarOnOrBefore(start, step, Boolean(recur.lastDayOfMonth), anchor);
		if (!last || last.steps < 1) return null;
		return addCalendarMonths(start, (last.steps - 1) * step, Boolean(recur.lastDayOfMonth));
	}
	const current = lastWalkedOnOrBefore(start, recur, anchor);
	if (!current) return null;
	return walkedBefore(start, recur, current);
}

export function earliestBalanceDate(raw: string): Date | null {
	let earliest: Date | null = null;
	for (const line of raw.split('\n')) {
		const body = stripDisabledPrefix(line.trim());
		if (!body || body.startsWith('---')) continue;
		const type = body.split('|')[0]?.toUpperCase().split('-')[0];
		if (type !== 'B') continue;
		const when = parseDate(body.split('|')[1]);
		if (!when?.startDate) continue;
		if (!earliest || dayKey(when.startDate) < dayKey(earliest)) {
			earliest = when.startDate;
		}
	}
	return earliest;
}

function remapOverrides(
	start: Date,
	newStart: Date,
	recur: Recur,
	overrides: Record<number, OccurrenceOverride>,
): Record<number, OccurrenceOverride> {
	const next: Record<number, OccurrenceOverride> = {};
	for (const [key, value] of Object.entries(overrides)) {
		const date = occurrenceAt(start, recur, +key);
		if (dayKey(date) < dayKey(newStart)) continue;
		next[occurrenceIndexOn(newStart, recur, date)] = value;
	}
	return next;
}

function disablePrefix(line: string): string {
	const trimmed = line.trim();
	if (!isEntryLineDisabled(trimmed)) return '';
	const rest = trimmed.slice(1);
	const body = rest.trimStart();
	return trimmed[0] + rest.slice(0, rest.length - body.length);
}

function rollLine(line: string, anchor: Date): (RecurringStartChange & { line: string }) | { line: string } | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('---')) return null;

	const prefix = disablePrefix(line);
	const body = prefix ? stripDisabledPrefix(trimmed) : trimmed;
	const parts = body.split('|');
	if (parts.length < 4) return null;

	const type = parts[0].toUpperCase().split('-')[0];
	if (!['B', 'C', 'D'].includes(type)) return null;

	const whenField = parts[1]?.replace(/-R/g, ',R') ?? '';
	const when = parseDate(whenField);
	if (!when?.startDate || !when.recur) return null;
	if (when.recur.count !== null) return null;

	const newStart = rollStartDate(when.startDate, when.recur, anchor);
	if (!newStart || dayKey(newStart) === dayKey(when.startDate)) return null;
	if (when.endDate && dayKey(newStart) > dayKey(when.endDate)) return null;

	const startRaw = whenField.split(',')[0] ?? '';
	const lastDayToken = isLastDayToken(startRaw) || Boolean(when.recur.lastDayOfMonth);
	const to = formatStart(newStart, lastDayToken);
	const from = startRaw;
	if (from === to) return { line };

	const { extras, overrides } = splitLineFields(body);
	const nextParts = [...parts];
	nextParts[1] = setWhenStart(whenField, to);
	const nextOverrides = remapOverrides(when.startDate, newStart, when.recur, overrides);
	return {
		line: prefix + writeLine(nextParts, extras, nextOverrides),
		desc: parts[3] || type,
		from,
		to,
	};
}

/**
 * Rewrite unbounded recurring lines so they start one interval before the last
 * occurrence on/before the balance date (or `anchor`). Forecast already drops
 * rows before B, but it still walks every occurrence from the text start.
 */
export function rollRecurringStarts(raw: string, anchor?: Date): RecurringStartRoll {
	const resolved = startOfLocalDay(anchor ?? earliestBalanceDate(raw) ?? new Date());
	const examples: RecurringStartChange[] = [];
	let changed = 0;
	const lines = raw.split('\n').map((line) => {
		const result = rollLine(line, resolved);
		if (!result || !('from' in result)) {
			return result && 'line' in result ? result.line : line;
		}
		changed += 1;
		if (examples.length < 8) {
			examples.push({ desc: result.desc, from: result.from, to: result.to });
		}
		return result.line;
	});
	return { raw: lines.join('\n'), changed, examples };
}
