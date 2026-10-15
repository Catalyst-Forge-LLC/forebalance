import { expect, it } from 'vitest';
import { readSettings } from './readSettings';
import { defaultSettings } from './defaultSettings';
it('rejects malformed settings and accepts both storage formats', () => {
  expect(readSettings(null)).toEqual(defaultSettings);
  expect(readSettings({ monthsToForecast: Infinity, locale: '!', currencyIsoCode: 'oops', useFederalHolidays: 'no' })).toEqual(defaultSettings);
  expect(readSettings({ monthsToForecast: 24 }).monthsToForecast).toBe(24);
  expect(readSettings({ version: 1, settings: { monthsToForecast: 12 } }).monthsToForecast).toBe(12);
});
