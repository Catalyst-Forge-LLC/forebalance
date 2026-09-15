import { describe, expect, it } from 'vitest';
import { currencyLabel, isValidCurrency } from './currencies';
import { ensureCurrencyHeader, extractCurrency, extractCurrencyFromBackupJson } from './currencyHeader';

describe('isValidCurrency', () => {
	it('accepts real ISO codes', () => {
		expect(isValidCurrency('usd')).toBe(true);
		expect(isValidCurrency('EUR')).toBe(true);
		expect(isValidCurrency('US')).toBe(false);
	});
});

describe('currencyLabel', () => {
	it('includes the ISO and a name', () => {
		expect(currencyLabel('EUR')).toMatch(/^EUR — /);
	});
});

describe('extractCurrency', () => {
	it('reads a --- currency header', () => {
		expect(extractCurrency('--- currency EUR\nB-CHCK-main|2026-01-01|10|Bal')).toBe('EUR');
	});

	it('reads # currency=USD', () => {
		expect(extractCurrency('# currency=gbp\nC|2026-01-01|1|X')).toBe('GBP');
	});

	it('returns null when nothing is marked', () => {
		expect(extractCurrency('B-CHCK-main|2026-01-01|10|Bal')).toBeNull();
	});

	it('reads a ForeBalance backup JSON', () => {
		const json = JSON.stringify({ app: 'forebalance', currencyIsoCode: 'cad', sets: [] });
		expect(extractCurrency(json)).toBe('CAD');
		expect(extractCurrencyFromBackupJson(json)).toBe('CAD');
		expect(extractCurrencyFromBackupJson('{ "nope": true }')).toBeNull();
	});
});

describe('ensureCurrencyHeader', () => {
	it('prepends a header when missing', () => {
		expect(ensureCurrencyHeader('B-CHCK-main|2026-01-01|10|Bal', 'eur')).toBe(
			'--- currency EUR\nB-CHCK-main|2026-01-01|10|Bal',
		);
	});

	it('replaces an existing header', () => {
		expect(ensureCurrencyHeader('--- currency USD\nC|2026-01-01|1|X', 'JPY')).toBe(
			'--- currency JPY\nC|2026-01-01|1|X',
		);
	});
});
