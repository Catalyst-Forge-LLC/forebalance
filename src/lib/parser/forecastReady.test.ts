import { describe, expect, it } from 'vitest';
import { forecastBlockReason } from './forecastReady';

describe('forecastBlockReason', () => {
	it('asks for a main balance line', () => {
		expect(forecastBlockReason('C|2026-01-01|10|Pay')).toMatch(/B-CHCK1234-main/);
	});

	it('treats empty text as empty', () => {
		expect(forecastBlockReason('')).toMatch(/empty/);
	});
});
