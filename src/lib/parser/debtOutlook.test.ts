import { describe, expect, it } from 'vitest';
import { parseEntries } from '$lib/parser/parseEntries';
import { debtOutlook } from '$lib/parser/debtOutlook';
import type { BalanceFlags } from '$lib/parser/types';

const flags: BalanceFlags = {
	below: { negative: 0, low: 0, uncomfortable: 0 },
	above: { goal: 0 },
};

const asOf = new Date(2026, 8, 1);

function outlookFor(raw: string, months: number, accountId: string) {
	const [entries] = parseEntries(raw, months, flags, { useFederalHolidays: false, balanceIncludesSameDay: true });
	return debtOutlook(entries?.[accountId] ?? [], asOf);
}

describe('debtOutlook', () => {
	it('names the payoff date when the balance clears inside the window', () => {
		const raw = `B-CHCK-main|2026-09-01|5000|Checking
D-CO|2026-09-18,R|500|Capital One|CO|1000|0`;
		const outlook = outlookFor(raw, 6, 'CO');
		expect(outlook?.beyondWindow).toBe(false);
		expect(outlook?.payoffDate?.getMonth()).toBe(9);
		expect(outlook?.months).toBe(1);
		expect(outlook?.interest).toBe(0);
		expect(outlook?.payments.some((payment) => payment.paidOff)).toBe(true);
	});

	it('says the balance outlasts the window and totals interest', () => {
		const raw = `B-CHCK-main|2026-09-01|5000|Checking
D-CO|2026-09-18,R|50|Capital One|CO|2000|12`;
		const outlook = outlookFor(raw, 4, 'CO');
		expect(outlook?.beyondWindow).toBe(true);
		expect(outlook?.payoffDate).toBeNull();
		expect(outlook?.interest).toBeGreaterThan(0);
		expect(outlook?.payments.length).toBeGreaterThan(1);
	});
});
