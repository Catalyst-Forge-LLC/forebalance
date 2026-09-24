import { formatLineExtras, parseLineExtras, type LineExtras } from '$lib/parser/lineExtras';
import { splitLineFields, writeLine } from '$lib/parser/occurrenceEdit';
import type { EntryType, OccurrenceOverride } from '$lib/parser/types';

export interface SourceLine {
	index: number;
	kind: 'blank' | 'comment' | 'entry';
	disabled: boolean;
	raw: string;
	type: EntryType;
	accountSuffix: string;
	isMain: boolean;
	when: string;
	amount: string;
	desc: string;
	extras: LineExtras;
	overrides: Record<number, OccurrenceOverride>;
}

export function readSourceLines(raw: string): SourceLine[] {
	return raw.split('\n').map((line, index) => readSourceLine(line, index));
}

export function readSourceLine(line: string, index: number): SourceLine {
	const trimmed = line.trim();
	const base = emptyLine(index, line);
	if (!trimmed) return { ...base, kind: 'blank' };
	if (trimmed.startsWith('---')) return { ...base, kind: 'comment' };
	const disabled = trimmed.startsWith('!') || trimmed.startsWith('#');
	const body = disabled ? trimmed.slice(1) : trimmed;
	const { parts, extras, overrides } = splitLineFields(body);
	if (parts.length < 4) return { ...base, kind: 'comment', disabled };
	const [type, accountSuffix, main] = parts[0].toUpperCase().split('-');
	if (type !== 'B' && type !== 'C' && type !== 'D') return { ...base, kind: 'comment', disabled };
	return {
		index,
		kind: 'entry',
		disabled,
		raw: line,
		type,
		accountSuffix: accountSuffix ?? '',
		isMain: main === 'MAIN',
		when: parts[1] ?? '',
		amount: parts[2] ?? '',
		desc: parts[3] ?? '',
		extras: parseLineExtras(extras),
		overrides,
	};
}

function emptyLine(index: number, raw: string): SourceLine {
	return {
		index,
		kind: 'blank',
		disabled: false,
		raw,
		type: 'D',
		accountSuffix: '',
		isMain: false,
		when: '',
		amount: '',
		desc: '',
		extras: { unknown: [] },
		overrides: {},
	};
}

export function writeSourceLine(line: SourceLine): string {
	const type = `${line.type}${line.accountSuffix ? `-${line.accountSuffix}` : ''}${line.isMain ? '-main' : ''}`;
	const parts = [type, line.when, line.amount, line.desc];
	const next = writeLine(parts, formatLineExtras(line.extras), line.overrides);
	return line.disabled ? `!${next}` : next;
}

export function replaceSourceLine(raw: string, index: number, nextLine: string): string {
	const lines = raw.split('\n');
	if (index < 0 || index >= lines.length) return raw;
	lines[index] = nextLine;
	return lines.join('\n');
}

export function removeSourceLine(raw: string, index: number): string {
	const lines = raw.split('\n');
	lines.splice(index, 1);
	return lines.join('\n');
}

export function insertSourceLine(raw: string, index: number, nextLine: string): string {
	const lines = raw.split('\n');
	lines.splice(index + 1, 0, nextLine);
	return lines.join('\n');
}
