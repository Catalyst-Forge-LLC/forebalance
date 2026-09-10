import { parseRecur } from '$lib/parser/recurrence';
import type { BusinessDayShift } from '$lib/parser/businessDays';

/** Keep aligned with static/md/help.md — short enough for a 1.7B context. */
export const FORMAT_CARD = `ForeBalance .psv (pipe-separated). One line:
TYPE|WHEN|AMOUNT|DESCRIPTION

TYPE: B = balance as of a date (resets the running balance). C = credit (money in). D = debit (money out).
Main checking: put -ACCOUNTID-main on the B line. Bare C/D apply to that main account.
Disable a line: prefix ! or # (example: !D|2026-04-16,R|500|Savings).
Section labels: --- Income (comment only).
There is no grid, matrix, or row/column code.

WHEN:
- Once: YYYY-MM-DD
- Recurring: YYYY-MM-DD,R[m][f][c] or YYYY-MM-DD,R[m][f],YYYY-MM-DD
- m = interval multiple (default 1). f = D daily, W weekly, M monthly (default), Y yearly. c = how many times (default: rest of the forecast).
Examples:
2026-04-01,R = monthly
2026-03-15,R3M = every third month
2026-01-01,RY = yearly
2026-02-01,R2W = every two weeks (same as people typing 2RW)
2026-02-01,RW5 = weekly, five times
2026-01-L,RML = last calendar day of each month
,R< = previous business day; ,R> = next business day (weekends, optional US holidays)

Debt on first use: TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR
One occurrence of a recurring line: append |#N=YYYY-MM-DD:AMT or |#N=AMT or |#N=YYYY-MM-DD
Example: D|2026-04-03,RW|80|Groceries|#5=2026-05-08:65
# at the start of a line still disables the whole line. |#5= is an override, not a disable.
Same-day order: B, then C, then D.`;

const UNIT: Record<string, [string, string]> = {
	D: ['day', 'days'],
	W: ['week', 'weeks'],
	M: ['month', 'months'],
	Y: ['year', 'years'],
};

function stripShift(raw: string): { text: string; shift: BusinessDayShift } {
	if (raw.endsWith('<')) return { text: raw.slice(0, -1), shift: 'prev' };
	if (raw.endsWith('>')) return { text: raw.slice(0, -1), shift: 'next' };
	return { text: raw, shift: null };
}

function explainRecurrenceToken(raw: string): string | null {
	const { text, shift } = stripShift(raw.toUpperCase());
	const recur = parseRecur(text.startsWith('R') ? text : `R${text}`);
	if (!recur) return null;
	const [one, many] = UNIT[recur.freq];
	const interval =
		recur.multiple === 1 ? `every ${one}` : `every ${recur.multiple} ${many}`;
	const last = recur.lastDayOfMonth ? ', on the last calendar day of the month' : '';
	const count =
		recur.count === null ? ', for the rest of the forecast window' : `, ${recur.count} times`;
	const biz =
		shift === 'prev'
			? ' If it lands on a weekend (or a US holiday, when that setting is on), it moves to the previous business day.'
			: shift === 'next'
				? ' If it lands on a weekend (or a US holiday, when that setting is on), it moves to the next business day.'
				: '';
	const token = `${recur.recurRaw ?? text}${shift === 'prev' ? '<' : shift === 'next' ? '>' : ''}`;
	return `\`${token}\` means ${interval}${last}${count}.${biz} Example: \`C|2026-02-01,${token}|1684|Paycheck\`.`;
}

function spokenRecur(question: string): string {
	return question.replace(/\b(\d+)R([DWMY])\b/gi, 'R$1$2');
}

/**
 * Instant Help answers for format tokens. Returns null when the model (plus FORMAT_CARD) should try.
 */
export function answerSyntaxQuestion(question: string): string | null {
	const spoken = spokenRecur(question.trim());
	if (!spoken) return null;

	if (/#\d+=|occurrence override|this occurrence/i.test(spoken)) {
		return 'A recurring line can override one occurrence: `|#5=2026-05-08:65` (date and amount), `|#5=65` (amount), or `|#5=2026-05-08` (date). Later occurrences stay on the original cadence. `#` at the start of a line still disables the whole line.';
	}
	if (/(?:^|[\s,|])[!#](?:$|[\s,|])|\bdisable\b|\bcomment out\b/i.test(spoken)) {
		return 'Prefix `!` or `#` to skip a line without deleting it. Example: `!D|2026-04-16,R|500|Savings this month`.';
	}
	if (/\b---\b|section label/i.test(spoken)) {
		return '`---` starts a section label (a comment). Example: `--- Income`. It does not move money.';
	}
	if (/\b-main\b|\bmain checking\b/i.test(spoken)) {
		return 'Put `-ACCOUNTID-main` on the balance line so bare C/D apply to that account. Example: `B-CHCK5432-main|2026-04-01|1000|Balance Checking 5432`.';
	}
	if (/\bRML\b|\b-L\b|last day of (the |every )?month/i.test(spoken)) {
		return '`,RML` (or a date like `2026-01-L`) is the last calendar day of each month. Example: `D|2026-01-L,RML|1200|Mortgage`.';
	}

	const token = spoken.match(/\bR[0-9]*ML[<>]?\b/i)?.[0] ?? spoken.match(/\bR[0-9]*[DWMY][0-9]*[<>]?\b/i)?.[0];
	if (token) {
		return explainRecurrenceToken(token);
	}

	if (/\bwhat (is|does)\s+B\b|\btype b\b|\bbalance reset\b/i.test(spoken)) {
		return '`B` is a balance as of a date. It resets the running balance. Example: `B-CHCK1775-main|2026-04-01|1840|Balance Checking 1775`.';
	}
	if (/\bwhat (is|does)\s+C\b|\btype c\b|\bcredit\b/i.test(spoken) && /\b(type|mean|credit|what)\b/i.test(spoken)) {
		return '`C` is a credit (money in). Example: `C|2026-04-01,R2W|1684|Paycheck`.';
	}
	if (/\bwhat (is|does)\s+D\b|\btype d\b|\bdebit\b/i.test(spoken) && /\b(type|mean|debit|what)\b/i.test(spoken)) {
		return '`D` is a debit (money out). Example: `D|2026-04-01,R<|1645|Rent`.';
	}

	return null;
}
