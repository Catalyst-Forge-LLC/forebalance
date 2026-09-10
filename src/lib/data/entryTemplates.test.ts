import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaultSettings';
import { getTemplate } from './entryTemplates';
import { parseEntries } from '$lib/parser/parseEntries';
import { computeForecastSummary } from '$lib/parser/forecastSummary';

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

describe('variable pay starter', () => {
	it('stays solvent over the default forecast window', () => {
		const raw = getTemplate('variable-pay').build('2026-09-');
		const [accountEntries, accounts] = parseEntries(
			raw,
			defaultSettings.monthsToForecast,
			balanceFlags,
			{ useFederalHolidays: true },
		);
		expect(accountEntries).toBeTruthy();
		const main = Object.values(accounts!).find((account) => account.isMain);
		expect(main).toBeTruthy();
		const entries = accountEntries![main!.id];
		const summary = computeForecastSummary(entries, balanceFlags, true);
		expect(summary.firstNegative).toBeNull();
		expect(summary.lowest?.balance).toBeGreaterThan(0);
		expect(summary.daysBelowZero).toBe(0);
	});
});
