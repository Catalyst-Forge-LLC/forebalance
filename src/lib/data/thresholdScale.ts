import { defaultSettings } from './defaultSettings';
import { normalizeCurrency } from './currencies';
import type { Settings } from '$lib/parser/types';

/**
 * Household-buffer scale vs USD. Not a live FX rate — order-of-magnitude so
 * a $500 uncomfortable line becomes a similar-feeling yen or won mark.
 */
export const CURRENCY_SCALE: Record<string, number> = {
	USD: 1,
	CAD: 1.3,
	MXN: 20,
	EUR: 1,
	GBP: 0.8,
	AUD: 1.5,
	NZD: 1.6,
	CHF: 1,
	SEK: 10,
	NOK: 10,
	DKK: 7,
	PLN: 4,
	CZK: 20,
	JPY: 150,
	CNY: 7,
	INR: 80,
	KRW: 1300,
	SGD: 1.3,
	HKD: 8,
	BRL: 5,
	ZAR: 18,
};

const USD_SLIDERS = {
	thresholdGoalBalance: { min: 500, max: 20000, step: 100 },
	thresholdUncomfortableBalance: { min: 50, max: 10000, step: 50 },
	thresholdLowBalance: { min: 50, max: 10000, step: 50 },
} as const;

export type ThresholdKey = keyof typeof USD_SLIDERS;

export function currencyScale(code: string): number {
	return CURRENCY_SCALE[normalizeCurrency(code)] ?? 1;
}

/** Two-ish significant figures, snapped to 0 or 5 on the second digit. */
export function niceRound(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	const exp = Math.floor(Math.log10(value)) - 1;
	const mag = 10 ** Math.max(0, exp);
	const two = Math.round(value / mag);
	const snapped = Math.max(1, Math.round(two / 5) * 5);
	return snapped * mag;
}

export function scaleAmount(value: number, fromCode: string, toCode: string): number {
	const from = currencyScale(fromCode);
	const to = currencyScale(toCode);
	if (from === to) return value;
	return niceRound(value * (to / from));
}

export function thresholdSliderRange(
	key: ThresholdKey,
	code: string,
): { min: number; max: number; step: number } {
	const usd = USD_SLIDERS[key];
	const factor = currencyScale(code);
	if (factor === 1) return { ...usd };
	const min = Math.max(1, scaleAmount(usd.min, 'USD', code));
	const max = Math.max(min * 2, scaleAmount(usd.max, 'USD', code));
	const step = Math.max(1, scaleAmount(usd.step, 'USD', code));
	return { min, max, step };
}

export function clampThreshold(value: number, key: ThresholdKey, code: string): number {
	const { min, max } = thresholdSliderRange(key, code);
	return Math.min(max, Math.max(min, value));
}

export function scaleThresholdSettings(
	settings: Settings,
	fromCode: string,
	toCode: string,
): Settings {
	if (normalizeCurrency(fromCode) === normalizeCurrency(toCode)) return settings;
	const goal = clampThreshold(
		scaleAmount(settings.thresholdGoalBalance, fromCode, toCode),
		'thresholdGoalBalance',
		toCode,
	);
	const uncomfortable = clampThreshold(
		scaleAmount(settings.thresholdUncomfortableBalance, fromCode, toCode),
		'thresholdUncomfortableBalance',
		toCode,
	);
	const low = clampThreshold(
		scaleAmount(settings.thresholdLowBalance, fromCode, toCode),
		'thresholdLowBalance',
		toCode,
	);
	return {
		...settings,
		thresholdGoalBalance: goal,
		thresholdUncomfortableBalance: uncomfortable,
		thresholdLowBalance: Math.min(low, uncomfortable),
	};
}

export function defaultThresholdsFor(code: string): Pick<
	Settings,
	'thresholdGoalBalance' | 'thresholdUncomfortableBalance' | 'thresholdLowBalance'
> {
	return {
		thresholdGoalBalance: scaleAmount(defaultSettings.thresholdGoalBalance, 'USD', code),
		thresholdUncomfortableBalance: scaleAmount(
			defaultSettings.thresholdUncomfortableBalance,
			'USD',
			code,
		),
		thresholdLowBalance: scaleAmount(defaultSettings.thresholdLowBalance, 'USD', code),
	};
}
