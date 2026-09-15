import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaultSettings';
import {
	niceRound,
	scaleAmount,
	scaleThresholdSettings,
	thresholdSliderRange,
} from './thresholdScale';

describe('niceRound', () => {
	it('keeps familiar USD marks', () => {
		expect(niceRound(200)).toBe(200);
		expect(niceRound(500)).toBe(500);
		expect(niceRound(2500)).toBe(2500);
	});

	it('avoids exact junk like 123,423', () => {
		expect(niceRound(123423)).toBe(100000);
		expect(niceRound(375000)).toBe(400000);
	});
});

describe('scaleAmount', () => {
	it('leaves same-scale currencies alone', () => {
		expect(scaleAmount(2500, 'USD', 'EUR')).toBe(2500);
	});

	it('turns USD buffers into yen-sized marks', () => {
		expect(scaleAmount(2500, 'USD', 'JPY')).toBe(400000);
		expect(scaleAmount(500, 'USD', 'JPY')).toBe(75000);
		expect(scaleAmount(200, 'USD', 'JPY')).toBe(30000);
	});

	it('round-trips yen back to the USD defaults', () => {
		expect(scaleAmount(400000, 'JPY', 'USD')).toBe(2500);
		expect(scaleAmount(75000, 'JPY', 'USD')).toBe(500);
		expect(scaleAmount(30000, 'JPY', 'USD')).toBe(200);
	});
});

describe('scaleThresholdSettings', () => {
	it('scales the three marks together', () => {
		const next = scaleThresholdSettings(defaultSettings, 'USD', 'KRW');
		expect(next.thresholdGoalBalance).toBe(3_500_000);
		expect(next.thresholdUncomfortableBalance).toBe(650_000);
		expect(next.thresholdLowBalance).toBe(250_000);
		expect(next.thresholdLowBalance).toBeLessThanOrEqual(next.thresholdUncomfortableBalance);
	});
});

describe('thresholdSliderRange', () => {
	it('widens the yen goal slider', () => {
		const yen = thresholdSliderRange('thresholdGoalBalance', 'JPY');
		expect(yen.max).toBeGreaterThan(200_000);
		expect(yen.step).toBeGreaterThanOrEqual(100);
	});
});
