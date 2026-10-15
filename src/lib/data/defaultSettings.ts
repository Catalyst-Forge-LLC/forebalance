import type { Settings } from '#lib/parser/types.ts';

export const defaultSettings: Settings = {
  thresholdGoalBalance: 2500,
  thresholdUncomfortableBalance: 500,
  thresholdLowBalance: 200,
  monthsToForecast: 6,
  locale: 'en-US',
  currencyIsoCode: 'USD',
  useFederalHolidays: true,
  balanceIncludesSameDay: true,
};
