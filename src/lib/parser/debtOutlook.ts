import dayjs from 'dayjs';
import type { ParsedEntry } from '$lib/parser/types';

export interface DebtPayment {
	date: Date;
	amount: number;
	interest: number;
	remaining: number;
	paidOff: boolean;
	overridden: boolean;
	pending: boolean;
}

export interface DebtOutlook {
	payoffDate: Date | null;
	/** Whole months from asOf to the payoff month. Null when the balance outlasts the forecast. */
	months: number | null;
	beyondWindow: boolean;
	interest: number;
	payments: DebtPayment[];
}

/** Read payoff and payment history from forecast rows for one debt account. */
export function debtOutlook(entries: ParsedEntry[], asOf: Date): DebtOutlook | null {
	const payments: DebtPayment[] = [];
	for (const entry of entries) {
		if (entry.type === 'B' || !entry.date) continue;
		if (entry.subAccountRunningBal === undefined && entry.monthlyInterest === undefined && entry.flag !== 'paid-off') {
			continue;
		}
		payments.push({
			date: entry.date,
			amount: +entry.amount || 0,
			interest: entry.monthlyInterest ?? 0,
			remaining: entry.subAccountRunningBal ?? 0,
			paidOff: entry.flag === 'paid-off',
			overridden: !!entry.overridden,
			pending: !!entry.pending,
		});
	}
	if (payments.length === 0) return null;

	const payoff = payments.find((payment) => payment.paidOff && payment.amount > 0) ?? null;
	const last = payments[payments.length - 1];
	const beyondWindow = !payoff && last.remaining > 1;
	const months = payoff
		? Math.max(0, dayjs(payoff.date).startOf('month').diff(dayjs(asOf).startOf('month'), 'month'))
		: null;

	return {
		payoffDate: payoff?.date ?? null,
		months,
		beyondWindow,
		interest: payments.reduce((sum, payment) => sum + payment.interest, 0),
		payments,
	};
}
