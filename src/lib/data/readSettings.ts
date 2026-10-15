import { defaultSettings } from './defaultSettings';
import type { Settings } from '../parser/types';

/** Accept the legacy object and versioned envelope; discard invalid fields individually. */
export function readSettings(value: unknown): Settings {
  const result = { ...defaultSettings };
  if (!value || typeof value !== 'object') return result;
  const envelope = value as Record<string, unknown>;
  const source = (envelope.version === 1 ? envelope.settings : value) as Record<string, unknown>;
  if (!source || typeof source !== 'object') return result;
  for (const key of ['thresholdGoalBalance', 'thresholdUncomfortableBalance', 'thresholdLowBalance'] as const) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key])) result[key] = source[key];
  }
  if (typeof source.monthsToForecast === 'number' && Number.isInteger(source.monthsToForecast) && source.monthsToForecast >= 3 && source.monthsToForecast <= 24)
    result.monthsToForecast = source.monthsToForecast;
  for (const key of ['useFederalHolidays', 'balanceIncludesSameDay'] as const) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  try {
    if (typeof source.locale === 'string' && Intl.getCanonicalLocales(source.locale).length) result.locale = source.locale;
  } catch {
    /* retain default */
  }
  if (typeof source.currencyIsoCode === 'string' && /^[A-Z]{3}$/.test(source.currencyIsoCode)) result.currencyIsoCode = source.currencyIsoCode;
  return result;
}
