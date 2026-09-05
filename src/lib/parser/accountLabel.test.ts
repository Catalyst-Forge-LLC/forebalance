import { describe, expect, it } from 'vitest';
import { accountDisplayName, formatAccountOption, parseAccountDisplay } from './accountLabel';
import type { Account } from './types';

describe('parseAccountDisplay', () => {
	it('splits Name-4321 from the description', () => {
		expect(parseAccountDisplay('Capital One-4321', 'CO')).toEqual({
			name: 'Capital One',
			lastFour: '4321',
		});
	});

	it('uses a numeric account id as last-four', () => {
		expect(parseAccountDisplay('Capital One', '4321')).toEqual({
			name: 'Capital One',
			lastFour: '4321',
		});
	});

	it('strips a Balance prefix', () => {
		expect(parseAccountDisplay('Balance Checking 1775', 'CHCK1775').name).toBe('Checking 1775');
	});
});

describe('formatAccountOption', () => {
	it('shows remaining balance and rate for debt', () => {
		const account: Account = {
			id: 'CO',
			isMain: false,
			name: 'Capital One',
			lastFour: '4321',
			startingBal: 2800,
			runningBal: 2147,
			interestRate: 19.99,
		};
		expect(formatAccountOption(account)).toBe('Capital One-4321 · $2,147 remaining · 19.99%');
	});

	it('marks paid-off debt', () => {
		const account: Account = {
			id: 'CO',
			isMain: false,
			name: 'Capital One',
			lastFour: '4321',
			startingBal: 2800,
			runningBal: 0,
			interestRate: 19.99,
		};
		expect(formatAccountOption(account)).toContain('paid off');
	});
});

describe('accountDisplayName', () => {
	it('joins name and last-four when needed', () => {
		expect(
			accountDisplayName({
				id: 'CO',
				isMain: false,
				name: 'Capital One',
				lastFour: '4321',
				startingBal: 1,
				runningBal: 1,
			}),
		).toBe('Capital One-4321');
	});
});
