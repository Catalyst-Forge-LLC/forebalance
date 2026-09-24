import { createFormatter } from '$lib/formatters/fmt';
import { localIsoDate } from '$lib/formatters/dates';
import { debtOutlook, type DebtOutlook } from '$lib/parser/debtOutlook';
import { parseEntries } from '$lib/parser/parseEntries';
import { replaceSourceLine, writeSourceLine, type SourceLine } from '$lib/parser/sourceLines';
import type { Account, BalanceFlags, ParsedEntry, Settings } from '$lib/parser/types';
import { evaluateMathJson, humanizeMathJson, MathJsonError } from './mathjson';

export const PAYOFF_CHIP = 'When will this be paid off at my current rate?';
export const INTEREST_CHIP = 'How much interest is this costing me this year in the forecast?';
export const EXTRA_CHIP = 'If I add $50 a month, when does it finish?';
export const THRESHOLD_CHIP = 'Am I on track for my low-balance threshold this month?';
export const TREND_CHIP = 'What is the trend of this account over the forecast?';
export const NORMAL_CHIP = 'Is this month’s amount normal for me?';
export const SPIKE_CHIP = 'When does this usually spike?';

export interface CardChip {
	id: string;
	label: string;
}

export interface CardAnswer {
	headline: number | null;
	unit: 'months' | 'currency' | 'number';
	prose: string;
	equation: string | null;
	confidence: 'formula' | 'prose' | 'refuse';
	/** True when a formula was rejected or missing. The headline stays empty. */
	unverified: boolean;
	source: 'forecast' | 'formula' | 'none';
}

const ALLOWED = ['Add', 'Subtract', 'Multiply', 'Divide', 'Negate', 'Power', 'Sqrt', 'Abs', 'Min', 'Max', 'Ceil', 'Floor', 'Round'];

export function cardLabsSystemPrompt(): string {
	return `You only see this card’s local entries. Do not invent accounts.
Do not compute final dollar or month totals yourself. Emit MathJSON.
Allowed operators: ${ALLOWED.join(', ')}.
Numbers and the symbol names you list in variables are allowed. No other functions.
JSON only. No markdown fences.
confidence is formula, prose, or refuse.
When the question is when a debt is paid off, do not use balance divided by payment. The host already has the forecast payoff.

Example, one month of interest. Balance 2800, APR 19.99.
{"answer":"About one month of interest at the current balance.","formula":["Multiply","balance",["Divide","apr",1200]],"variables":{"balance":2800,"apr":19.99},"confidence":"formula"}

Example, months if there were no interest, a lower bound only.
{"answer":"Without interest this is a lower bound, not the real payoff.","formula":["Ceil",["Divide","balance","payment"]],"variables":{"balance":2800,"payment":150},"confidence":"formula"}`;
}

export function chipsForLine(line: SourceLine): CardChip[] {
	if (line.type === 'B') {
		return [
			{ id: 'threshold', label: THRESHOLD_CHIP },
			{ id: 'trend', label: TREND_CHIP },
		];
	}
	if (isDebtLine(line)) {
		return [
			{ id: 'payoff', label: PAYOFF_CHIP },
			{ id: 'interest', label: INTEREST_CHIP },
			{ id: 'extra', label: EXTRA_CHIP },
		];
	}
	return [
		{ id: 'normal', label: NORMAL_CHIP },
		{ id: 'spike', label: SPIKE_CHIP },
	];
}

export function isDebtLine(line: SourceLine): boolean {
	if (line.type !== 'D') return false;
	const sized = line.extras.strategy === 'min' || line.extras.strategy === 'pct';
	return Boolean(
		(line.accountSuffix && !line.isMain) ||
			line.extras.accountSlot ||
			line.extras.startingBal !== undefined ||
			line.extras.apr !== undefined ||
			line.extras.payUrl ||
			line.extras.autopay !== undefined ||
			sized,
	);
}

export function answerCardQuestion(
	raw: string,
	line: SourceLine,
	settings: Settings,
	prompt: string,
	asOf = new Date(),
): CardAnswer {
	const trimmed = prompt.trim();
	if (!trimmed) {
		return refuse('Type a question or tap a chip.');
	}
	const fromModel = answerModelJson(trimmed);
	if (fromModel) return fromModel;

	const parsed = parseForecast(raw, settings);
	if (!parsed) return refuse('This file does not forecast yet, so there is no number to check.');

	const extra = extraAmount(trimmed);
	if (extra !== null && isDebtLine(line)) return extraPayoff(raw, line, settings, parsed, extra, asOf);
	if (isPayoffAsk(trimmed) && isDebtLine(line)) return payoffAnswer(line, parsed, asOf, settings);
	if (/interest/i.test(trimmed) && isDebtLine(line)) return interestAnswer(line, parsed, asOf, settings);
	if (/threshold|on track/i.test(trimmed)) return thresholdAnswer(line, parsed, asOf, settings);
	if (/trend/i.test(trimmed)) return trendAnswer(line, parsed, settings);
	if (/normal/i.test(trimmed)) return normalAnswer(line, parsed, asOf, settings);
	if (/spike/i.test(trimmed)) return spikeAnswer(line, parsed, settings);

	return {
		headline: null,
		unit: 'number',
		prose: 'The chips answer from the forecast without loading a model. Open Labs for a free-form question.',
		equation: null,
		confidence: 'refuse',
		unverified: false,
		source: 'none',
	};
}

/** Context sent with a model prompt. Other scenarios are not included. */
export function cardContextPayload(raw: string, line: SourceLine, settings: Settings, asOf = new Date()) {
	const parsed = parseForecast(raw, settings);
	const accountId = accountKey(line);
	const account = accountId ? parsed?.accounts[accountId] : undefined;
	const outlook = outlookFor(line, parsed, asOf);
	return {
		entry: {
			type: line.type,
			desc: line.desc,
			amount: numberOrNull(line.amount),
			when: line.when,
			categoryId: line.extras.categoryId ?? null,
			accountId,
		},
		account: account
			? {
					id: account.id,
					name: account.name ?? null,
					lastFour: account.lastFour ?? null,
					runningBal: account.runningBal,
					startingBal: account.startingBal,
					apr: account.interestRate ?? null,
					apr2: account.interestRate2 ?? null,
					apr2Date: account.interestRate2Date ?? null,
					strategy: account.strategy ?? null,
					extraPayment: account.extraPayment ?? null,
					payUrl: account.payUrl ?? null,
				}
			: null,
		history: (outlook?.payments ?? []).map((payment) => ({
			date: localIsoDate(payment.date),
			amount: payment.amount,
			interest: payment.interest,
			remaining: payment.remaining,
		})),
		settings: {
			monthsToForecast: settings.monthsToForecast,
			currencyIsoCode: settings.currencyIsoCode,
		},
	};
}

function answerModelJson(text: string): CardAnswer | null {
	if (!text.startsWith('{')) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;
	const record = parsed as Record<string, unknown>;
	const prose = typeof record.answer === 'string' ? record.answer : '';
	const confidence = record.confidence === 'formula' || record.confidence === 'prose' || record.confidence === 'refuse'
		? record.confidence
		: 'prose';
	if (confidence === 'refuse') return refuse(prose || 'Cannot answer from this card.');
	if (confidence !== 'formula' || record.formula === undefined) {
		return {
			headline: null,
			unit: 'number',
			prose: prose || 'No formula was returned.',
			equation: null,
			confidence: 'prose',
			unverified: true,
			source: 'formula',
		};
	}
	const variables = numericMap(record.variables);
	try {
		const headline = evaluateMathJson(record.formula, variables);
		return {
			headline,
			unit: 'number',
			prose,
			equation: humanizeMathJson(record.formula),
			confidence: 'formula',
			unverified: false,
			source: 'formula',
		};
	} catch (error) {
		const reason = error instanceof MathJsonError ? error.message : 'could not verify the math';
		return {
			headline: null,
			unit: 'number',
			prose: `${prose} Could not verify the math. ${reason}`.trim(),
			equation: null,
			confidence: 'prose',
			unverified: true,
			source: 'formula',
		};
	}
}

function payoffAnswer(
	line: SourceLine,
	parsed: Forecast,
	asOf: Date,
	settings: Settings,
): CardAnswer {
	const outlook = outlookFor(line, parsed, asOf);
	if (!outlook) return refuse('This debt has no payments in the forecast.');
	if (outlook.months === null) {
		const interest = interestFormula(outlook, asOf, false);
		return verified(
			interest.value,
			'currency',
			`Still open after this forecast. Interest inside the window is ${money(settings, interest.value)}.`,
			interest.formula,
			interest.variables,
		);
	}
	const formula = ['Round', 'payoffMonths'];
	const variables = { payoffMonths: outlook.months };
	const date = outlook.payoffDate ? createFormatter(settings).date(outlook.payoffDate) : '';
	return verified(
		evaluateMathJson(formula, variables),
		'months',
		`At the current payment this pays off ${date} (${outlook.months} ${outlook.months === 1 ? 'month' : 'months'}). Monthly APR/12 inside the forecast, not a lender quote.`,
		formula,
		variables,
	);
}

function interestAnswer(line: SourceLine, parsed: Forecast, asOf: Date, settings: Settings): CardAnswer {
	const outlook = outlookFor(line, parsed, asOf);
	if (!outlook) return refuse('This debt has no interest rows in the forecast.');
	const interest = interestFormula(outlook, asOf, true);
	return verified(
		interest.value,
		'currency',
		`Interest on payment dates in ${asOf.getFullYear()} inside this forecast is ${money(settings, interest.value)}.`,
		interest.formula,
		interest.variables,
	);
}

function extraPayoff(
	raw: string,
	line: SourceLine,
	settings: Settings,
	parsed: Forecast,
	extra: number,
	asOf: Date,
): CardAnswer {
	const current = outlookFor(line, parsed, asOf);
	if (line.extras.strategy === 'min' || line.extras.strategy === 'pct') {
		return refuse(
			'An extra dollar amount is not applied on top of a minimum or percent payment yet. The payoff above uses the current rule.',
		);
	}
	const amount = Number(line.amount);
	if (!Number.isFinite(amount)) return refuse('This line has no dollar payment to add to.');
	const bumped = writeSourceLine({ ...line, amount: String(Math.round((amount + extra) * 100) / 100) });
	const next = parseForecast(replaceSourceLine(raw, line.index, bumped), settings);
	const outlook = next ? outlookFor(line, next, asOf) : null;
	if (!outlook || outlook.months === null) {
		return refuse(`Adding ${money(settings, extra)} a month still does not pay this off inside the forecast.`);
	}
	const was = current?.months;
	const formula = ['Round', 'payoffMonths'];
	const variables = { payoffMonths: outlook.months };
	const compare = was === null || was === undefined ? '' : ` It was ${was} ${was === 1 ? 'month' : 'months'} at the current payment.`;
	return verified(
		evaluateMathJson(formula, variables),
		'months',
		`Adding ${money(settings, extra)} a month pays this off in ${outlook.months} ${outlook.months === 1 ? 'month' : 'months'}.${compare}`,
		formula,
		variables,
	);
}

function thresholdAnswer(line: SourceLine, parsed: Forecast, asOf: Date, settings: Settings): CardAnswer {
	const balances = monthBalances(rowsFor(line, parsed), line.type === 'B' ? !line.accountSuffix || line.isMain : true);
	const month = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`;
	const thisMonth = balances.filter((row) => row.month === month).map((row) => row.balance);
	if (thisMonth.length === 0) return refuse('This month has no balance in the forecast.');
	const formula = ['Min', ...thisMonth];
	const lowest = evaluateMathJson(formula, {});
	const mark = settings.thresholdLowBalance;
	const onTrack = lowest >= mark;
	return verified(
		lowest,
		'currency',
		onTrack
			? `Yes. The lowest this month is ${money(settings, lowest)}, at or above the low-balance mark of ${money(settings, mark)}.`
			: `No. The lowest this month is ${money(settings, lowest)}, under the low-balance mark of ${money(settings, mark)}.`,
		formula,
		{},
	);
}

function trendAnswer(line: SourceLine, parsed: Forecast, settings: Settings): CardAnswer {
	const ends = monthEndBalances(rowsFor(line, parsed), line.type === 'B' ? !line.accountSuffix || line.isMain : true);
	if (ends.length < 2) return refuse('The forecast needs two months to show a trend.');
	const first = ends[0];
	const last = ends[ends.length - 1];
	const formula = ['Subtract', 'last', 'first'];
	const variables = { first: first.balance, last: last.balance };
	const delta = evaluateMathJson(formula, variables);
	const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
	return verified(
		delta,
		'currency',
		`From ${first.month} to ${last.month} this account is ${direction} ${money(settings, Math.abs(delta))} (${money(settings, first.balance)} to ${money(settings, last.balance)}).`,
		formula,
		variables,
	);
}

function normalAnswer(line: SourceLine, parsed: Forecast, asOf: Date, settings: Settings): CardAnswer {
	const amounts = seriesAmounts(line, parsed);
	if (amounts.length === 0) return refuse('This line has no amounts in the forecast.');
	const month = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`;
	const current = amounts.filter((row) => row.month === month).map((row) => row.amount);
	const usual = median(amounts.map((row) => row.amount));
	const now = current.length ? current[current.length - 1] : usual;
	const formula = ['Subtract', 'now', 'usual'];
	const variables = { now, usual };
	const gap = evaluateMathJson(formula, variables);
	const close = Math.abs(gap) < 0.5;
	return verified(
		now,
		'currency',
		close
			? `Yes. This month is ${money(settings, now)}, the same as the usual ${money(settings, usual)} in the forecast.`
			: `This month is ${money(settings, now)}. The usual amount in the forecast is ${money(settings, usual)}.`,
		formula,
		variables,
	);
}

function spikeAnswer(line: SourceLine, parsed: Forecast, settings: Settings): CardAnswer {
	const amounts = seriesAmounts(line, parsed);
	if (amounts.length === 0) return refuse('This line has no amounts in the forecast.');
	const peak = amounts.reduce((best, row) => (row.amount > best.amount ? row : best));
	const formula = ['Max', ...amounts.map((row) => row.amount)];
	const value = evaluateMathJson(formula, {});
	return verified(
		value,
		'currency',
		`The highest amount in the forecast is ${money(settings, value)} on ${peak.date}.`,
		formula,
		{},
	);
}

function interestFormula(outlook: DebtOutlook, asOf: Date, thisYearOnly: boolean) {
	const year = asOf.getFullYear();
	const values = outlook.payments
		.filter((payment) => !thisYearOnly || payment.date.getFullYear() === year)
		.map((payment) => Math.round(payment.interest * 100) / 100);
	const formula = values.length ? ['Add', ...values] : ['Add', 0];
	const value = evaluateMathJson(formula, {});
	return { formula, variables: {}, value };
}

function verified(
	_headline: number,
	unit: CardAnswer['unit'],
	prose: string,
	formula: unknown,
	variables: Record<string, number>,
): CardAnswer {
	return {
		headline: evaluateMathJson(formula, variables),
		unit,
		prose,
		equation: humanizeMathJson(formula),
		confidence: 'formula',
		unverified: false,
		source: 'forecast',
	};
}

function refuse(prose: string): CardAnswer {
	return {
		headline: null,
		unit: 'number',
		prose,
		equation: null,
		confidence: 'refuse',
		unverified: false,
		source: 'none',
	};
}

interface Forecast {
	entries: Record<string, ParsedEntry[]>;
	accounts: Record<string, Account>;
	mainId: string;
}

function parseForecast(raw: string, settings: Settings): Forecast | null {
	const flags: BalanceFlags = {
		below: {
			negative: 0,
			low: settings.thresholdLowBalance,
			uncomfortable: settings.thresholdUncomfortableBalance,
		},
		above: { goal: settings.thresholdGoalBalance },
	};
	const [entries, accounts] = parseEntries(raw, settings.monthsToForecast, flags, {
		useFederalHolidays: settings.useFederalHolidays,
		balanceIncludesSameDay: settings.balanceIncludesSameDay,
	});
	if (!entries || !accounts) return null;
	const main = Object.values(accounts).find((account) => account.isMain);
	if (!main) return null;
	return { entries, accounts, mainId: main.id };
}

function accountKey(line: SourceLine): string {
	return (line.accountSuffix || line.extras.accountSlot || '').toUpperCase();
}

function outlookFor(line: SourceLine, parsed: Forecast | null, asOf: Date): DebtOutlook | null {
	if (!parsed) return null;
	const key = accountKey(line);
	if (!key) return null;
	return debtOutlook(parsed.entries[key] ?? [], asOf);
}

function rowsFor(line: SourceLine, parsed: Forecast): ParsedEntry[] {
	const key = accountKey(line);
	if (key && parsed.entries[key]) return parsed.entries[key];
	return parsed.entries[parsed.mainId] ?? [];
}

function monthBalances(entries: ParsedEntry[], useMain: boolean): { month: string; balance: number }[] {
	const rows: { month: string; balance: number }[] = [];
	for (const entry of entries) {
		if (!entry.date) continue;
		const balance = useMain ? entry.mainBalance : (entry.subAccountRunningBal ?? entry.balance ?? entry.mainBalance);
		if (balance === undefined) continue;
		rows.push({ month: localIsoDate(entry.date).slice(0, 7), balance });
	}
	return rows;
}

function monthEndBalances(entries: ParsedEntry[], useMain: boolean): { month: string; balance: number }[] {
	const byMonth = new Map<string, number>();
	for (const row of monthBalances(entries, useMain)) byMonth.set(row.month, row.balance);
	return [...byMonth.entries()].map(([month, balance]) => ({ month, balance }));
}

function seriesAmounts(line: SourceLine, parsed: Forecast): { month: string; amount: number; date: string }[] {
	const desc = line.desc.trim();
	return rowsFor(line, parsed)
		.filter((entry) => entry.type === line.type && (entry.desc ?? '').trim() === desc && entry.date)
		.map((entry) => ({
			month: localIsoDate(entry.date as Date).slice(0, 7),
			amount: Math.abs(+entry.amount || 0),
			date: localIsoDate(entry.date as Date),
		}));
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2) return sorted[mid];
	return (sorted[mid - 1] + sorted[mid]) / 2;
}

function extraAmount(prompt: string): number | null {
	const match = /add\s+\$?\s*(\d+(?:\.\d+)?)/i.exec(prompt);
	if (!match) return null;
	return Number(match[1]);
}

function isPayoffAsk(prompt: string): boolean {
	return /paid off|payoff|when does it finish|when will this/i.test(prompt);
}

function money(settings: Settings, value: number): string {
	return createFormatter(settings).curr(value);
}

function numberOrNull(value: string): number | null {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function numericMap(value: unknown): Record<string, number> {
	if (!value || typeof value !== 'object') return {};
	const out: Record<string, number> = {};
	for (const [key, item] of Object.entries(value)) {
		if (typeof item === 'number' && Number.isFinite(item)) out[key] = item;
	}
	return out;
}
