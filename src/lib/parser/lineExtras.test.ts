import { describe, expect, it } from 'vitest';
import { formatLineExtras, parseLineExtras } from './lineExtras';
import { parseEntries } from './parseEntries';
import { splitLineFields } from './occurrenceEdit';
import type { BalanceFlags } from './types';

const flags: BalanceFlags = {
	below: { negative: 0, low: 200, uncomfortable: 500 },
	above: { goal: 2500 },
};

function roundTrip(extras: string[]) {
	const parsed = parseLineExtras(extras);
	return parseLineExtras(formatLineExtras(parsed));
}

describe('parseLineExtras', () => {
	it('reads an old debt line with no new fields', () => {
		expect(parseLineExtras(['CO', '2800', '19.99'])).toMatchObject({
			accountSlot: 'CO',
			startingBal: 2800,
			apr: 19.99,
			unknown: [],
		});
		expect(parseLineExtras(['CO', '2800', '19.99']).strategy).toBeUndefined();
	});

	it('keeps a second APR and its date', () => {
		expect(parseLineExtras(['CO', '2800', '19.99', '12.5', '2027-01-01'])).toMatchObject({
			apr2: 12.5,
			apr2Date: '2027-01-01',
		});
	});

	it('reads strategy, rate, url, category, notes, and autopay', () => {
		const extras = parseLineExtras([
			'CO',
			'2800',
			'19.99',
			'',
			'min',
			'0.02',
			'https://www.capitalone.com',
			'debt',
			'refi note',
			'autopay',
		]);
		expect(extras).toMatchObject({
			strategy: 'min',
			minRate: 0.02,
			payUrl: 'https://www.capitalone.com',
			categoryId: 'debt',
			notes: 'refi note',
			autopay: true,
			unknown: [],
		});
		expect(roundTrip(extras && [
			'CO',
			'2800',
			'19.99',
			'',
			'min',
			'0.02',
			'https://www.capitalone.com',
			'debt',
			'refi note',
			'autopay',
		])).toMatchObject(extras);
	});

	it('treats pct amount as data on the line, not as income', () => {
		expect(parseLineExtras(['CO', '2800', '19.99', '', 'pct', '', '', 'debt', 'five percent of balance'])).toMatchObject({
			strategy: 'pct',
			categoryId: 'debt',
			notes: 'five percent of balance',
		});
	});

	it('does not store a javascript url', () => {
		const extras = parseLineExtras(['CO', '2800', '19.99', '', 'fixed', '', 'javascript:alert(1)', 'debt']);
		expect(extras.payUrl).toBeUndefined();
		expect(extras.unknown).toContain('javascript:alert(1)');
	});

	it('keeps an override token out of the extras', () => {
		const { extras } = splitLineFields(
			'D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99|#5=2026-05-20:200',
		);
		expect(parseLineExtras(extras).strategy).toBeUndefined();
		expect(parseLineExtras(extras).apr).toBe(19.99);
	});
});

describe('parseEntries debt fields', () => {
	it('puts the new fields on the account and the entry', () => {
		const raw = `B-CHCK1000-main|2026-04-01|420|Starting checking
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99|min|0.02|https://www.capitalone.com|debt|refi note|autopay`;
		const [entries, accounts] = parseEntries(raw, 2, flags);
		expect(accounts?.CO).toMatchObject({
			startingBal: 2800,
			interestRate: 19.99,
			strategy: 'min',
			minRate: 0.02,
			payUrl: 'https://www.capitalone.com',
			categoryId: 'debt',
			notes: 'refi note',
			autopay: true,
		});
		const payment = entries?.CO?.find((entry) => entry.type === 'D');
		expect(payment).toMatchObject({
			strategy: 'min',
			minRate: 0.02,
			categoryId: 'debt',
			autopay: true,
		});
	});

	it('still parses a shipping debt line', () => {
		const raw = `B-CHCK1000-main|2026-04-01|420|Starting checking
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99`;
		const [, accounts] = parseEntries(raw, 2, flags);
		expect(accounts?.CO.startingBal).toBe(2800);
		expect(accounts?.CO.interestRate).toBe(19.99);
		expect(accounts?.CO.strategy).toBeUndefined();
	});
});
