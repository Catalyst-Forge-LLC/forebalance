import { describe, expect, it } from 'vitest';
import { draftPsvFromDescription, keepPsvLines, normalizeDraftLines } from './draft';

describe('draftPsvFromDescription', () => {
	it('reads a euro rent amount the same as a bare number', () => {
		const lines = draftPsvFromDescription('Rent €1,185 on the 1st', new Date(2026, 8, 10));
		expect(lines).toEqual(['D|2026-09-01,R|1185|Rent']);
	});

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

describe('normalizeDraftLines', () => {
	it('turns weekday names into the next ISO date and RW', () => {
		expect(
			normalizeDraftLines(
				['D|2026-09-10,R|14322|Rent', 'C|Tuesday,R|120|Uber', 'C|Thursday,R|120|Uber'],
				new Date(2026, 8, 10),
			),
		).toEqual([
			'D|2026-09-10,R|14322|Rent',
			'C|2026-09-15,RW|120|Uber',
			'C|2026-09-10,RW|120|Uber',
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
