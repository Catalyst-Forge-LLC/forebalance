import { localIsoDate } from '$lib/formatters/dates';

const WEEKDAY: Record<string, number> = {
	sunday: 0,
	sun: 0,
	monday: 1,
	mon: 1,
	tuesday: 2,
	tue: 2,
	tues: 2,
	wednesday: 3,
	wed: 3,
	thursday: 4,
	thu: 4,
	thur: 4,
	thurs: 4,
	friday: 5,
	fri: 5,
	saturday: 6,
	sat: 6,
};

const PSV_LINE = /^[BCD](-[A-Za-z0-9]+)?(-main)?\|[^\n|]+\|[^\n|]+\|[^\n]+$/;

function nextWeekday(from: Date, weekday: number): Date {
	const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
	const delta = (weekday - date.getDay() + 7) % 7;
	date.setDate(date.getDate() + delta);
	return date;
}

function monthDay(from: Date, day: number): string {
	const year = from.getFullYear();
	const month = String(from.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function weekdaysIn(text: string): number[] {
	const found: number[] = [];
	for (const [name, value] of Object.entries(WEEKDAY)) {
		if (new RegExp(`\\b${name}\\b`, 'i').test(text) && !found.includes(value)) {
			found.push(value);
		}
	}
	return found;
}

const MONEY_MARK = /[$€£¥]/;

function amountIn(text: string): string | null {
	const match = text.match(new RegExp(`${MONEY_MARK.source}?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?`));
	return match ? match[1].replace(/,/g, '') : null;
}

const WEEKDAY_NAMES = Object.keys(WEEKDAY).sort((a, b) => b.length - a.length);

function weekdayInWhen(when: string): number | null {
	const first = when.split(',')[0]?.trim() ?? '';
	for (const name of WEEKDAY_NAMES) {
		if (new RegExp(`^${name}s?$`, 'i').test(first)) return WEEKDAY[name];
	}
	return null;
}

/** Rewrite `C|Tuesday,R|120|Uber` to `C|2026-09-15,RW|120|Uber`. */
export function normalizeDraftLine(line: string, now = new Date()): string {
	const parts = line.split('|');
	if (parts.length < 4) return line;
	const weekday = weekdayInWhen(parts[1] ?? '');
	if (weekday === null) return line;
	const recur = /r2w/i.test(parts[1]) ? 'R2W' : 'RW';
	parts[1] = `${localIsoDate(nextWeekday(now, weekday))},${recur}`;
	return parts.join('|');
}

export function normalizeDraftLines(lines: string[], now = new Date()): string[] {
	return lines.map((line) => normalizeDraftLine(line, now));
}

/** Keep only lines that look like ForeBalance .psv. Drops essays and leftover thinking. */
export function keepPsvLines(text: string): string[] {
	return text
		.split(/\n/)
		.map((line) => line.trim().replace(/^`+|`+$/g, ''))
		.filter((line) => PSV_LINE.test(line))
		.map((line) => normalizeDraftLine(line));
}

/**
 * Turn a short English description into .psv lines without a model.
 * Covers rent-on-the-Nth and pay-every-weekday; returns [] when it cannot.
 */
export function draftPsvFromDescription(text: string, now = new Date()): string[] {
	const lines: string[] = [];
	const seen = new Set<string>();

	const push = (line: string) => {
		if (!seen.has(line)) {
			seen.add(line);
			lines.push(line);
		}
	};

	const rent = text.match(
		/\brent(?:al)?\b(?:\s+of)?\s*[$€£¥]?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s+on(?:\s+the)?\s+(\d{1,2})(?:st|nd|rd|th)?)?/i,
	);
	if (rent) {
		const day = rent[2] ? Number(rent[2]) : 1;
		push(`D|${monthDay(now, day)},R|${rent[1].replace(/,/g, '')}|Rent`);
	}

	const income = text.match(
		/\b(?:mak(?:e|ing)|pay(?:check)?s?|income|earn(?:ing|s)?|gig)\b[\s\S]{0,80}/i,
	);
	if (income) {
		const chunk = income[0];
		const amount = amountIn(chunk);
		const days = weekdaysIn(chunk.length > 8 ? chunk : text);
		if (amount && days.length) {
			const name = /\bgig\b/i.test(chunk) ? 'Gig pay' : 'Pay';
			for (const weekday of days) {
				push(`C|${localIsoDate(nextWeekday(now, weekday))},RW|${amount}|${name}`);
			}
		} else if (amount && /\bevery\s+two\s+weeks|bi[- ]?week/i.test(text)) {
			push(`C|${localIsoDate(now)},R2W|${amount}|Pay`);
		}
	}

	return lines;
}
