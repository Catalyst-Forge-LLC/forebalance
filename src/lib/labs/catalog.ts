export type QueryKind = 'forecast' | 'syntax' | 'draft' | 'product';

export interface QueryType {
	id: string;
	kind: QueryKind;
	title: string;
	when: string;
	match: RegExp;
	template: string;
}

export const QUERY_TYPES: QueryType[] = [
	{
		id: 'tight',
		kind: 'forecast',
		title: 'Why is this tight?',
		when: 'tight, lowest, squeeze, why is this week hard',
		match: /\b(tight|lowest|squeeze|why is (this|it) (hard|tight))\b/i,
		template:
			'Tight: after {name} ({D|C} {amt}) on {date}, you\'re at {bal}. Lowest, {gap} vs uncomfortable.\nWatch: next risk or "stays above". Next after the low: {line}.\nTry: ! on that debit, or C|{dayBefore}|{need}|Buffer before {name}',
	},
	{
		id: 'upcoming',
		kind: 'forecast',
		title: 'What hits next?',
		when: 'what hits next, upcoming, what is coming',
		match: /\b(hits next|upcoming|coming up|what.?s next)\b/i,
		template: '{date} {C|D} {amt} {name} → {bal}\n(one row each, then one sentence: which is the squeeze)',
	},
	{
		id: 'drains',
		kind: 'forecast',
		title: 'Where does the money go?',
		when: 'where does the money go, biggest bills, drains',
		match: /\b(money go|biggest (bills|drains)|where does it go|top debit)\b/i,
		template: '{name}: {total} ({n}× {typical})\nThen one sentence: which change adds the most room before the lowest date.',
	},
	{
		id: 'afford',
		kind: 'forecast',
		title: 'Can I afford this?',
		when: 'can I afford, what if I spend, tire / purchase',
		match: /\b(afford|what if I (spend|buy|pay)|can I (buy|spend))\b/i,
		template: 'Yes|Tight|No\nLowest after {name} is {bal}, {gap} vs uncomfortable ({threshold}).\nC|{date}|{amt}|{name}',
	},
	{
		id: 'first-negative',
		kind: 'forecast',
		title: 'When do I go negative?',
		when: 'negative, broke, below zero, red',
		match: /\b(negative|below zero|go broke|in the red)\b/i,
		template: 'First negative: {date} after {name}, to {bal}.\nOr: Stays at or above zero.',
	},
	{
		id: 'first-uncomfortable',
		kind: 'forecast',
		title: 'When do I hit uncomfortable?',
		when: 'uncomfortable, low threshold, dip under',
		match: /\b(hit|under|below) (uncomfortable|the line|low)\b/i,
		template: 'First under uncomfortable: {date} after {name}, to {bal}.\nOr: Stays above uncomfortable.',
	},
	{
		id: 'skip-whatif',
		kind: 'forecast',
		title: 'What if I skip this?',
		when: 'skip, pause, cancel a bill this month',
		match: /\b(skip|pause|cancel|without) (the |this |my )?\w+/i,
		template: 'Prefix that line with ! and check Forecast.\n!D|{when}|{amt}|{name}',
	},
	{
		id: 'recur',
		kind: 'syntax',
		title: 'Recurrence token',
		when: 'R2W, 2RW, RW, R, R3M, RY, RW5',
		match: /\b(r\d*[dwmy]\d*|\d+r[dwmy]|what does ,?r)\b/i,
		template: '`{token}` means {every N units}, {count or rest of window}. Example: C|2026-02-01,{token}|1684|Paycheck',
	},
	{
		id: 'last-day',
		kind: 'syntax',
		title: 'Last day of month',
		when: 'RML, -L, last day of the month',
		match: /\b(rml|-l|last day)\b/i,
		template: '`,RML` or `2026-01-L` is the last calendar day each month.\nD|2026-01-L,RML|1200|Mortgage',
	},
	{
		id: 'business-day',
		kind: 'syntax',
		title: 'Business days',
		when: 'R< R> weekend holiday',
		match: /\b(business day|r<|>|weekend)\b/i,
		template: '`,R<` previous business day; `,R>` next. Weekends (and optional US holidays) move.\nD|2026-09-05,R<|1000|Rent',
	},
	{
		id: 'occurrence',
		kind: 'syntax',
		title: 'One occurrence',
		when: '#5= Groceries #5 this occurrence override',
		match: /#\d+=|occurrence override|this occurrence/i,
		template:
			'Append |#N=date:amt, |#N=amt, or |#N=date. Later occurrences stay on cadence.\nD|2026-04-03,RW|80|Groceries|#5=2026-05-08:65',
	},
	{
		id: 'disable',
		kind: 'syntax',
		title: 'Disable a line',
		when: '! # skip without deleting',
		match: /(^|[^\w])[!#]([^\w]|$)|disable|comment out/i,
		template: 'Prefix `!` or `#` to skip a line.\n!D|2026-04-16,R|500|Savings this month',
	},
	{
		id: 'type-bcd',
		kind: 'syntax',
		title: 'B, C, D',
		when: 'what is B/C/D, credit, debit, balance reset',
		match: /\b(type [bcd]|what (is|does) [bcd]\b|balance reset)\b/i,
		template: 'B = balance as of a date (resets). C = credit in. D = debit out.\nB-CHCK1775-main|2026-04-01|1840|Balance Checking 1775',
	},
	{
		id: 'main',
		kind: 'syntax',
		title: 'Main account',
		when: '-main, main checking',
		match: /\b-main\b|main (checking|account)/i,
		template: 'Put `-ACCOUNTID-main` on the B line. Bare C/D apply there.\nB-CHCK5432-main|2026-04-01|1000|Balance Checking 5432',
	},
	{
		id: 'section',
		kind: 'syntax',
		title: 'Section label',
		when: '--- Income',
		match: /---|section label/i,
		template: '`---` is a comment only.\n--- Income',
	},
	{
		id: 'debt',
		kind: 'syntax',
		title: 'Debt account',
		when: 'APR, sub-account, card payment line',
		match: /\b(apr|sub-?account|debt line|starting_bal)\b/i,
		template:
			'TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR\nD-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99',
	},
	{
		id: 'same-day',
		kind: 'syntax',
		title: 'Same-day order',
		when: 'same day, which posts first, already in balance',
		match: /\b(same[- ]day|order of (B|C|D)|which (posts|hits) first|already in (the )?balance|posted today)\b/i,
		template:
			'Same day: B, then C, then D. A B line is the end-of-day number by default (same-day C/D are in balance). |#N=pending means that occurrence has not posted yet.',
	},
	{
		id: 'draft-rent',
		kind: 'draft',
		title: 'Draft rent',
		when: 'rent $X on the Nth',
		match: /\brent(?:al)?\b/i,
		template:
			'D|{YYYY-MM-DD},R|{amt}|Rent\nAlways emit this line if rent is mentioned. If amount is missing, use 0.',
	},
	{
		id: 'draft-weekdays',
		kind: 'draft',
		title: 'Draft weekday pay',
		when: 'every Tuesday and Thursday, each Friday',
		match:
			/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)s?\b/i,
		template:
			'C|2026-09-15,RW|120|Uber\nC|2026-09-17,RW|120|Uber\nWHEN must be YYYY-MM-DD,RW — never the weekday name. Earn / Uber is C.',
	},
	{
		id: 'draft-biweekly',
		kind: 'draft',
		title: 'Draft every two weeks',
		when: 'every two weeks, biweekly, R2W paycheck',
		match: /\b(every two weeks|bi[- ]?week|r2w|2rw)\b/i,
		template: 'C|{YYYY-MM-DD},R2W|{amt}|Paycheck',
	},
	{
		id: 'draft-weekly',
		kind: 'draft',
		title: 'Draft weekly',
		when: 'every week, weekly groceries',
		match: /\b(every week|weekly)\b/i,
		template: 'D|{YYYY-MM-DD},RW|{amt}|{name}',
	},
	{
		id: 'draft-lastday',
		kind: 'draft',
		title: 'Draft last-day bill',
		when: 'mortgage last day, RML',
		match: /\b(mortgage|last day of (the |every )?month)\b/i,
		template: 'D|{YYYY-MM}-L,RML|{amt}|Mortgage',
	},
	{
		id: 'draft-balance',
		kind: 'draft',
		title: 'Draft starting balance',
		when: 'starting balance, I have $X on date',
		match: /\b(starting balance|i have [$€£¥]?\d|balance of)\b/i,
		template: 'B-CHCK0000-main|{YYYY-MM-DD}|{amt}|Balance Checking 0000',
	},
	{
		id: 'draft-oneshot',
		kind: 'draft',
		title: 'Draft one-shot',
		when: 'once on a date, tire Friday, one payment',
		match: /\b(once|one[- ]?time|one-shot|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
		template: 'D|{YYYY-MM-DD}|{amt}|{name}',
	},
	{
		id: 'draft-debt',
		kind: 'draft',
		title: 'Draft debt payment',
		when: 'card payment with APR and remaining',
		match: /\b(card payment|pay(?:ing)? down|apr\b|remaining)\b/i,
		template: 'D-CO|{YYYY-MM-DD},R|{amt}|{Name}-4321|CO|{remaining}|{apr}',
	},
	{
		id: 'scenarios',
		kind: 'product',
		title: 'Scenarios',
		when: 'what is a scenario, switch sets',
		match: /\bscenarios?\b/i,
		template:
			'A scenario is one forecast (Entries + Forecast share the picker). Switch, rename, clone; Import/Export is the current one only.',
	},
	{
		id: 'privacy',
		kind: 'product',
		title: 'Privacy',
		when: 'does this leave the device, are you uploading',
		match: /\b(privacy|leave the (device|browser)|upload|sent to)\b/i,
		template: 'Entries and prompts stay in this tab. Labs models run on-device. See Privacy in the site menu.',
	},
];

export const OUTSIDE_RULES = `Rules:
- If one type matches, copy that template and fill the user's numbers.
- If several match, stack those templates (rent + Tue/Thu pay = those two shapes).
- If none match: start with "Closest: {id}, {id}" and mix from those, or "Not a ForeBalance ask — see Help."
- Never write a paragraph about the assignment. Never invent a grid. Never invent account numbers.
- Rent and bills are D. Pay / making / income / gig are C. No B line unless they gave a starting balance.`;

/** How display currency affects Labs answers. Numbers are never converted. */
export function currencyPromptNote(currencyIsoCode = 'USD'): string {
	return `Display currency is ${currencyIsoCode}. Labels only — do not convert amounts. $ € £ or a bare number in the ask is the same figure. In prose, format money as ${currencyIsoCode}. .psv AMOUNT fields stay bare numbers with no symbol.`;
}

export function matchQueryTypes(text: string): QueryType[] {
	const ask = text.trim();
	if (!ask) return [];
	return QUERY_TYPES.filter((type) => type.match.test(ask));
}

export function typesById(ids: string[]): QueryType[] {
	const wanted = new Set(ids);
	return QUERY_TYPES.filter((type) => wanted.has(type.id));
}

const CATALOG_IDS = QUERY_TYPES.map((type) => type.id);

/** Tier 1: ids and triggers only — no answer shapes. The model is the router. */
export function routerPrompt(currencyIsoCode = 'USD'): string {
	const list = QUERY_TYPES.map((type) => `${type.id} — ${type.when}`).join('\n');
	return `You are the ForeBalance Labs router. Reply with 1-3 type ids, comma-separated, or none.
Never paste the menu. Never answer the user. Never write .psv.
${currencyPromptNote(currencyIsoCode)}

${list}

Examples (copy this shape):
rent on the 7th and earn $120 from Uber every Tue/Thu → draft-rent, draft-weekdays
What does R2W mean? → recur
Can I afford a $240 tire on Friday? → afford
Why is this tight? → tight`;
}

export function routerRetryPrompt(): string {
	return `Too many ids (that was the menu). Reply with 1-3 ids for THIS ask only.
Shape: draft-rent, draft-weekdays
No other words.`;
}

export function parseRouterReply(text: string): string[] {
	const known = new Set(CATALOG_IDS);
	const tokens = text.toLowerCase().match(/[a-z]+(?:-[a-z0-9]+)*/g) ?? [];
	return [...new Set(tokens.filter((token) => known.has(token)))];
}

/** True when the model echoed the catalog instead of routing. */
export function isMenuEcho(ids: string[]): boolean {
	if (ids.length >= 6) return true;
	if (ids.length < 4) return false;
	const positions = ids.map((id) => CATALOG_IDS.indexOf(id)).filter((index) => index >= 0);
	let run = 1;
	for (let i = 1; i < positions.length; i++) {
		if (positions[i] === positions[i - 1] + 1) {
			run += 1;
			if (run >= 4) return true;
		} else {
			run = 1;
		}
	}
	return false;
}

export function refineRoutedIds(ids: string[], ask: string): string[] {
	if (isMenuEcho(ids)) return [];
	let types = typesById(ids);
	if (/\b(rent|earn|uber|paycheck|gig|every|tuesday|thursday)\b/i.test(ask)) {
		const drafts = types.filter((type) => type.kind === 'draft');
		if (drafts.length) types = drafts;
	}
	return types.slice(0, 3).map((type) => type.id);
}

/** Tier 2: only the routed templates. */
export function specialistPrompt(types: QueryType[], currencyIsoCode = 'USD'): string {
	if (!types.length) {
		return `ForeBalance Labs. This ask did not match a type.
${currencyPromptNote(currencyIsoCode)}
Say: Not a ForeBalance ask — see Help.
Do not invent a grid. Do not invent .psv unless they clearly asked to draft lines.`;
	}
	const body = types.map((type) => `[${type.id}] ${type.title}\n${type.template}`).join('\n\n');
	const mix =
		types.length > 1
			? 'Stack these templates. Fill the user numbers. If they are draft types, .psv lines only.'
			: 'Copy this template. Fill the user numbers.';
	return `ForeBalance Labs specialist.\n${mix}\n${currencyPromptNote(currencyIsoCode)}\nNever write a paragraph about the assignment. Never invent a grid.\n\n${body}`;
}

export function catalogPrompt(kinds?: QueryKind[], currencyIsoCode = 'USD'): string {
	const types = kinds ? QUERY_TYPES.filter((type) => kinds.includes(type.kind)) : QUERY_TYPES;
	const body = types
		.map((type) => `[${type.id}] ${type.title}\nWhen: ${type.when}\n${type.template}`)
		.join('\n\n');
	return `ForeBalance Labs. Answer by copying a type template.\n\n${currencyPromptNote(currencyIsoCode)}\n\n${OUTSIDE_RULES}\n\n${body}`;
}

export function describeMatches(types: QueryType[]): string {
	if (!types.length) {
		return 'No exact type. Mix the closest templates. If none apply, say so and point at Help.';
	}
	return `Matched: ${types.map((type) => type.id).join(', ')}. Use those templates.`;
}
