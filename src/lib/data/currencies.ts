/** ISO codes we offer in Settings. Amounts stay bare numbers; this is display only. */
export const CURRENCY_CODES = [
	'USD',
	'CAD',
	'MXN',
	'EUR',
	'GBP',
	'AUD',
	'NZD',
	'CHF',
	'SEK',
	'NOK',
	'DKK',
	'PLN',
	'CZK',
	'JPY',
	'CNY',
	'INR',
	'KRW',
	'SGD',
	'HKD',
	'BRL',
	'ZAR',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function normalizeCurrency(code: string): string {
	return code.trim().toUpperCase();
}

export function isValidCurrency(code: string): boolean {
	const iso = normalizeCurrency(code);
	if (!/^[A-Z]{3}$/.test(iso)) return false;
	try {
		new Intl.NumberFormat('en', { style: 'currency', currency: iso }).format(0);
		return true;
	} catch {
		return false;
	}
}

export function currencyLabel(code: string, locale = 'en-US'): string {
	const iso = normalizeCurrency(code);
	try {
		const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(iso);
		return name ? `${iso} — ${name}` : iso;
	} catch {
		return iso;
	}
}

export function listedCurrencies(locale = 'en-US'): { code: string; label: string }[] {
	return CURRENCY_CODES.map((code) => ({ code, label: currencyLabel(code, locale) }));
}
