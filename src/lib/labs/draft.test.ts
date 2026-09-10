import { describe, expect, it } from 'vitest';
import { draftPsvFromDescription, keepPsvLines } from './draft';

describe('draftPsvFromDescription', () => {
	it('drafts rent on the 7th and pay on Tue/Thu', () => {
		const lines = draftPsvFromDescription(
			'Rent of 1546 on the 7th, and making $120 every tuesday and thursday.',
			new Date(2026, 8, 10),
		);
		expect(lines).toEqual([
			'D|2026-09-07,R|1546|Rent',
			'C|2026-09-15,RW|120|Pay',
			'C|2026-09-10,RW|120|Pay',
		]);
	});
});

describe('keepPsvLines', () => {
	it('drops the homework essay', () => {
		expect(
			keepPsvLines(
				'Okay, rent is probably a credit.\nD|2026-09-07,R|1546|Rent\nC|2026-09-15,RW|120|Pay',
			),
		).toEqual(['D|2026-09-07,R|1546|Rent', 'C|2026-09-15,RW|120|Pay']);
	});
});
