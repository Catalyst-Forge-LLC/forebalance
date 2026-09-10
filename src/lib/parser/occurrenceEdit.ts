import { localIsoDate } from '$lib/formatters/dates';
import { getDate } from '$lib/parser/recurrence';
import type { OccurrenceOverride, ParsedEntry } from '$lib/parser/types';

const OVERRIDE_FIELD = /^#(\d+)=(.*)$/;
const DATE_THEN_AMOUNT = /^(\d{4}-\d{1,2}-\d{1,2})(?::(.+))?$/;
const AMOUNT_ONLY = /^:?(-?\d+(?:\.\d+)?)$/;

export function isOverrideField(field: string): boolean {
	return OVERRIDE_FIELD.test(field);
}

export function parseOverrideField(field: string): { n: number; value: OccurrenceOverride } | null {
	const match = OVERRIDE_FIELD.exec(field);
	if (!match) return null;
	const n = +match[1];
	const value = parseOverrideValue(match[2]);
	if (!n || !value) return null;
	return { n, value };
}

export function parseOverrideValue(raw: string): OccurrenceOverride | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const dated = DATE_THEN_AMOUNT.exec(trimmed);
	if (dated) {
		const amountPart = dated[2];
		if (amountPart !== undefined && amountPart !== '') {
			if (!AMOUNT_ONLY.test(amountPart)) return null;
			return { date: dated[1], amount: +amountPart };
		}
		return { date: dated[1] };
	}
	if (AMOUNT_ONLY.test(trimmed)) {
		return { amount: +trimmed.replace(/^:/, '') };
	}
	return null;
}

export function formatOverrideField(n: number, value: OccurrenceOverride): string {
	if (value.date && value.amount !== undefined) {
		return `#${n}=${value.date}:${value.amount}`;
	}
	if (value.date) return `#${n}=${value.date}`;
	return `#${n}=${value.amount}`;
}

export function splitLineFields(line: string): { parts: string[]; extras: string[]; overrides: Record<number, OccurrenceOverride> } {
	const parts = line.split('|');
	const overrides: Record<number, OccurrenceOverride> = {};
	const extras: string[] = [];
	for (const field of parts.slice(4)) {
		const parsed = parseOverrideField(field);
		if (parsed) {
			overrides[parsed.n] = parsed.value;
		} else {
			extras.push(field);
		}
	}
	return { parts, extras, overrides };
}

export function applyOverrideToEntry(entry: ParsedEntry, override: OccurrenceOverride | undefined): void {
	entry.overridden = false;
	if (!override) return;
	if (override.date) {
		const next = getDate(override.date);
		if (next) {
			entry.date = next;
			entry.overridden = true;
		}
	}
	if (override.amount !== undefined) {
		entry.amount = override.amount;
		entry.overridden = true;
	}
}

function replaceSourceLine(raw: string, entry: ParsedEntry, nextLine: string): string {
	const lines = raw.split('\n');
	const idx =
		entry.entryOrder !== undefined && lines[entry.entryOrder] === entry.rawEntry
			? entry.entryOrder
			: lines.findIndex((line) => line === entry.rawEntry);
	if (idx < 0) return raw;
	lines[idx] = nextLine;
	return lines.join('\n');
}

function setWhenStart(when: string | undefined, date: string): string {
	const parts = (when ?? '').split(',');
	parts[0] = date;
	return parts.join(',');
}

function upsertOverrideOnLine(
	line: string,
	n: number,
	value: OccurrenceOverride | null,
): string {
	const { parts, extras, overrides } = splitLineFields(line);
	if (value) {
		overrides[n] = value;
	} else {
		delete overrides[n];
	}
	const head = parts.slice(0, 4);
	const overrideFields = Object.keys(overrides)
		.map((key) => +key)
		.sort((a, b) => a - b)
		.map((key) => formatOverrideField(key, overrides[key]));
	return [...head, ...extras, ...overrideFields].join('|');
}

export function applyForecastEdit(
	raw: string,
	entry: ParsedEntry,
	edit: { date: string; amount: number },
): string {
	const date = edit.date.trim();
	const amount = +edit.amount;
	if (!date || Number.isNaN(amount)) return raw;

	const currentDate = localIsoDate(entry.date);
	if (currentDate === date && +entry.amount === amount) {
		return raw;
	}

	const lines = raw.split('\n');
	const idx =
		entry.entryOrder !== undefined && lines[entry.entryOrder] === entry.rawEntry
			? entry.entryOrder
			: lines.findIndex((line) => line === entry.rawEntry);
	if (idx < 0) return raw;
	const line = lines[idx];

	if (!entry.recur) {
		const { parts, extras, overrides } = splitLineFields(line);
		parts[1] = setWhenStart(parts[1], date);
		parts[2] = String(amount);
		const overrideFields = Object.keys(overrides)
			.map((key) => +key)
			.sort((a, b) => a - b)
			.map((key) => formatOverrideField(key, overrides[key]));
		return replaceSourceLine(raw, entry, [...parts.slice(0, 4), ...extras, ...overrideFields].join('|'));
	}

	const n = entry.occurrenceIndex ?? 1;
	const scheduledDate = localIsoDate(entry.seriesDate ?? entry.date);
	const baseAmount = entry.baseAmount ?? +entry.amount;
	const matchesSeries = scheduledDate === date && baseAmount === amount;
	if (matchesSeries) {
		return replaceSourceLine(raw, entry, upsertOverrideOnLine(line, n, null));
	}

	const value: OccurrenceOverride = {};
	if (scheduledDate !== date) value.date = date;
	if (baseAmount !== amount) value.amount = amount;
	return replaceSourceLine(raw, entry, upsertOverrideOnLine(line, n, value));
}
