import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaultSettings';
import { buildSimpleExample } from './simpleExample';
import { parseEntries } from '$lib/parser/parseEntries';

const balanceFlags = {
	below: {
		negative: 0,
		low: defaultSettings.thresholdLowBalance,
		uncomfortable: defaultSettings.thresholdUncomfortableBalance,
	},
	above: {
		goal: defaultSettings.thresholdGoalBalance,
	},
};

describe('simple walkthrough example', () => {
	it('parses into starting, rent, and paycheck rows with threshold flags', () => {
		const raw = buildSimpleExample('2026-09-');
		expect(raw).toContain('C|2026-09-15,R|1800|Paycheck');
		expect(raw).toContain('D|2026-09-01,R|1500|Rent');

		const [accountEntries, accounts] = parseEntries(raw, 3, balanceFlags, {
			useFederalHolidays: false,
		});
		expect(accountEntries).toBeTruthy();
		const main = Object.values(accounts!).find((account) => account.isMain);
		expect(main).toBeTruthy();
		const rows = accountEntries![main!.id];
		expect(rows[0].type).toBe('B');
		expect(rows[0].mainBalance).toBe(420);
		expect(rows[0].flag).toBe('uncomfortable');
		expect(rows[1].type).toBe('D');
		expect(rows[1].desc).toMatch(/^Rent/);
		expect(rows[1].inBalance).toBe(true);
		expect(rows[1].mainBalance).toBe(420);
		expect(rows[1].flag).toBe('uncomfortable');
		expect(rows[2].type).toBe('C');
		expect(rows[2].desc).toMatch(/^Paycheck/);
		expect(rows[2].mainBalance).toBe(2220);
		expect(rows[2].flag ?? '').toBe('');
	});
});
