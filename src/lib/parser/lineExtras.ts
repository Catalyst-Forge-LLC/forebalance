import { DEFAULT_MIN_RATE, type PaymentStrategy } from '$lib/parser/types';

export interface LineExtras {
	accountSlot?: string;
	startingBal?: number;
	apr?: number;
	apr2?: number;
	apr2Date?: string;
	strategy?: PaymentStrategy;
	minRate?: number;
	payUrl?: string;
	categoryId?: string;
	notes?: string;
	autopay?: boolean;
	/** Extra dollars added on top of each scheduled payment. */
	extraPayment?: number;
	unknown: string[];
}

const STRATEGIES = new Set<PaymentStrategy>(['fixed', 'min', 'pct']);
const AUTOPAY = /^(no)?autopay$/i;
const EXTRA = /^extra=(\d+(?:\.\d+)?)$/i;
const ISO_DATE = /^\d{4}-\d{1,2}-\d{1,2}$/;

function isNumeric(value: string): boolean {
	return /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

export function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Fields after DESCRIPTION. 0–2 are ACCOUNT, STARTING_BAL, APR.
 * A following number is APR2 and a following date is APR2_DATE.
 * Empty pipes before STRATEGY are ignored. After STRATEGY the slots are
 * positional: MIN_RATE, PAY_URL, CATEGORY, NOTES, then optional autopay.
 */
export function parseLineExtras(extras: string[]): LineExtras {
	const result: LineExtras = { unknown: [] };
	if (extras[0]?.trim()) result.accountSlot = extras[0].trim();
	if (extras[1]?.trim() && isNumeric(extras[1])) result.startingBal = +extras[1];
	if (extras[2]?.trim() && isNumeric(extras[2])) result.apr = +extras[2];

	const tokens = extras.slice(3);
	let index = 0;
	while (index < tokens.length && tokens[index].trim() === '') index += 1;

	if (tokens[index]?.trim() && isNumeric(tokens[index])) {
		result.apr2 = +tokens[index];
		index += 1;
		if (tokens[index]?.trim() && ISO_DATE.test(tokens[index].trim())) {
			result.apr2Date = tokens[index].trim();
			index += 1;
		}
		while (index < tokens.length && tokens[index].trim() === '') index += 1;
	}

	const rest = tokens.slice(index);
	const extraAt = rest.findIndex((field) => EXTRA.test(field.trim()));
	if (extraAt >= 0) {
		result.extraPayment = +EXTRA.exec(rest[extraAt].trim())![1];
		rest.splice(extraAt, 1);
	}
	let autopayAt: number | undefined;
	if (rest.length > 0 && AUTOPAY.test(rest[rest.length - 1].trim())) {
		autopayAt = rest.length - 1;
		result.autopay = rest[autopayAt].trim().toLowerCase() === 'autopay';
	}
	const named = autopayAt === undefined ? rest : rest.slice(0, autopayAt);

	const strategy = named[0]?.trim().toLowerCase();
	if (!strategy || !STRATEGIES.has(strategy as PaymentStrategy)) {
		result.unknown = named.map((field) => field.trim()).filter((field) => field.length > 0);
		return result;
	}
	result.strategy = strategy as PaymentStrategy;
	if (named[1]?.trim()) {
		if (isNumeric(named[1])) result.minRate = +named[1];
		else result.unknown.push(named[1].trim());
	}
	if (named[2]?.trim()) {
		if (isHttpUrl(named[2])) result.payUrl = named[2].trim();
		else result.unknown.push(named[2].trim());
	}
	if (named[3]?.trim()) result.categoryId = named[3].trim();
	if (named[4]?.trim()) result.notes = named[4].trim();
	for (const extra of named.slice(5)) {
		if (extra.trim()) result.unknown.push(extra.trim());
	}
	return result;
}

/** Dollar payment the forecast should apply for this occurrence. */
export function resolvePayment(
	strategy: PaymentStrategy | undefined,
	amount: number,
	runningBal: number,
	minRate?: number,
): number {
	if (!strategy || strategy === 'fixed') return amount;
	if (strategy === 'pct') return Math.max(0, (amount / 100) * runningBal);
	const floor = amount > 0 ? amount : 0.01;
	const rate = minRate ?? DEFAULT_MIN_RATE;
	return Math.max(floor, rate * runningBal);
}

/** Shortest extra list that parses back to the same fields. */
export function formatLineExtras(extras: LineExtras): string[] {
	const head: string[] = [
		extras.accountSlot ?? '',
		extras.startingBal === undefined ? '' : String(extras.startingBal),
		extras.apr === undefined ? '' : String(extras.apr),
	];
	if (extras.apr2) head.push(String(extras.apr2));
	if (extras.apr2Date) {
		if (!extras.apr2) head.push('');
		head.push(extras.apr2Date);
	}

	const tail: string[] = ['', '', '', '', ''];
	let last = -1;
	const needsStrategy =
		extras.strategy ||
		extras.minRate !== undefined ||
		extras.payUrl ||
		extras.categoryId ||
		extras.notes ||
		extras.autopay !== undefined;
	if (needsStrategy) {
		tail[0] = extras.strategy ?? 'fixed';
		last = 0;
	}
	if (extras.minRate !== undefined) {
		tail[1] = String(extras.minRate);
		last = 1;
	}
	if (extras.payUrl) {
		tail[2] = extras.payUrl;
		last = 2;
	}
	if (extras.categoryId) {
		tail[3] = extras.categoryId;
		last = 3;
	}
	if (extras.notes) {
		tail[4] = extras.notes;
		last = 4;
	}
	const named = last < 0 ? [] : tail.slice(0, last + 1);
	named.push(...extras.unknown);
	if (extras.extraPayment !== undefined && extras.extraPayment > 0) {
		named.push(`extra=${extras.extraPayment}`);
	}
	if (extras.autopay === true) named.push('autopay');
	if (extras.autopay === false) named.push('noautopay');

	const fields = [...head, ...named];
	while (fields.length > 0 && fields[fields.length - 1] === '') fields.pop();
	return fields;
}
