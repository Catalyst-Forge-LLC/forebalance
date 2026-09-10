import { currentMonthPrefix } from './entryTemplates';

export const SIMPLE_EXAMPLE_ID = 'simple-example';
export const SIMPLE_EXAMPLE_NAME = 'Simple walkthrough';

/** One recurring credit and one recurring debit, for first-use teaching. */
export function buildSimpleExample(monthPrefix = currentMonthPrefix()): string {
	return `B-CHCK1000-main|${monthPrefix}01|420|Starting checking
C|${monthPrefix}15,R|1800|Paycheck
D|${monthPrefix}01,R|1500|Rent
`;
}
