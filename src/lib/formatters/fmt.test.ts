import { describe, expect, it } from 'vitest';
import { defaultSettings } from '$lib/data/defaultSettings';
import { createFormatter } from './fmt';

describe('createFormatter', () => {
	it('labels amounts with the chosen currency', () => {
		const usd = createFormatter({ ...defaultSettings, currencyIsoCode: 'USD' });
		const eur = createFormatter({ ...defaultSettings, currencyIsoCode: 'EUR' });
		expect(usd.curr(1684)).toMatch(/1,684/);
		expect(usd.curr(1684)).toMatch(/\$/);
		expect(eur.curr(1684)).toMatch(/1,684/);
		expect(eur.curr(1684)).toMatch(/€/);
	});
});
