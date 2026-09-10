export type ThresholdMarkId = 'goal' | 'uncomfortable' | 'low' | 'negative' | 'paid-off';

export interface ThresholdMark {
	id: ThresholdMarkId;
	mark: string;
	label: string;
	meaning: string;
}

export const THRESHOLD_MARKS: ThresholdMark[] = [
	{ id: 'goal', mark: '▲', label: 'Goal', meaning: 'Above your goal threshold' },
	{
		id: 'uncomfortable',
		mark: '◆',
		label: 'Uncomfortable',
		meaning: 'Below your uncomfortable threshold',
	},
	{ id: 'low', mark: '▼', label: 'Low', meaning: 'Below your low threshold' },
	{ id: 'negative', mark: '⚠', label: 'Negative', meaning: 'Below zero' },
	{ id: 'paid-off', mark: '✓', label: 'Paid off', meaning: 'Debt remaining at or near zero' },
];

const byId = Object.fromEntries(THRESHOLD_MARKS.map((item) => [item.id, item])) as Record<
	ThresholdMarkId,
	ThresholdMark
>;

export function thresholdMark(flag: string | undefined): ThresholdMark | undefined {
	if (!flag) return undefined;
	return byId[flag as ThresholdMarkId];
}

export function flagIndicator(flag: string | undefined): string {
	const item = thresholdMark(flag);
	return item ? `${item.mark} ` : '';
}

export function flagLabel(flag: string | undefined): string {
	return thresholdMark(flag)?.label ?? '';
}
