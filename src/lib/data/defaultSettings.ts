import type { Settings } from '$lib/parser/types';

export const defaultSettings: Settings = {
	thresholdGoalBalance: 5000,
	thresholdUncomfortableBalance: 1000,
	thresholdLowBalance: 500,
	monthsToForecast: 6,
	locale: 'en-US',
	currencyIsoCode: 'USD',
	useFederalHolidays: true,
};
