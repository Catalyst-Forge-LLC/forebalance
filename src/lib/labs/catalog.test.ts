import { describe, expect, it } from 'vitest';
import {
	QUERY_TYPES,
	catalogPrompt,
	matchQueryTypes,
	parseRouterReply,
	routerPrompt,
	specialistPrompt,
	typesById,
} from './catalog';

describe('query catalog', () => {
	it('covers a couple dozen types and still fits a 4k window', () => {
		expect(QUERY_TYPES.length).toBeGreaterThanOrEqual(20);
		expect(QUERY_TYPES.length).toBeLessThanOrEqual(32);
		expect(catalogPrompt().length).toBeLessThan(7000);
	});

	it('stacks rent and weekday pay', () => {
		const ids = matchQueryTypes(
			'Rent of 1546 on the 7th, and making $120 every tuesday and thursday.',
		).map((type) => type.id);
		expect(ids).toContain('draft-rent');
		expect(ids).toContain('draft-weekdays');
	});

	it('treats an unknown ask as empty so the model can mix', () => {
		expect(matchQueryTypes('Write me a haiku about the color blue')).toEqual([]);
	});

	it('keeps the router thin and the specialist specific', () => {
		const rentPay = typesById(['draft-rent', 'draft-weekdays']);
		expect(routerPrompt()).not.toContain('D|{YYYY-MM-DD},R|{amt}|Rent');
		expect(routerPrompt()).toContain('draft-rent —');
		expect(parseRouterReply('Closest: draft-rent, draft-weekdays')).toEqual([
			'draft-rent',
			'draft-weekdays',
		]);
		const specialist = specialistPrompt(rentPay);
		expect(specialist).toContain('D|{YYYY-MM-DD},R|{amt}|Rent');
		expect(specialist).toContain('C|{next that weekday},RW|{amt}|Pay');
		expect(specialist).not.toContain('[afford]');
		expect(specialist.length).toBeLessThan(catalogPrompt().length / 2);
	});
});
