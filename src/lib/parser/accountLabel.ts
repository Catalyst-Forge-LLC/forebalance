import { fmt } from '$lib/formatters/fmt';
import type { Account } from './types';

export interface AccountDisplay {
	name: string;
	lastFour?: string;
}

/** Pull a friendly name and optional last-4 from DESCRIPTION (`Capital One-4321`) or a numeric account id. */
export function parseAccountDisplay(
	desc: string | null | undefined,
	accountId: string,
): AccountDisplay {
	const cleaned = (desc ?? '').replace(/^Balance\s+/i, '').trim();
	const dashFour = /^(.*?)-(\d{3,5})$/.exec(cleaned);
	if (dashFour) {
		return { name: dashFour[1].trim() || cleaned, lastFour: dashFour[2] };
	}
	if (/^\d{3,5}$/.test(accountId)) {
		return { name: cleaned || accountId, lastFour: accountId };
	}
	return { name: cleaned || accountId };
}

export function accountDisplayName(account: Account): string {
	const name = account.name?.trim() || account.id;
	if (account.lastFour && !name.endsWith(`-${account.lastFour}`)) {
		return `${name}-${account.lastFour}`;
	}
	return name;
}

export function formatAccountOption(account: Account): string {
	const label = accountDisplayName(account);
	const remaining = account.runningBal;
	const rate = account.interestRate ?? 0;

	if (account.isMain) {
		return `${label} · ${fmt.curr(remaining)}`;
	}

	const balancePart = remaining <= 1 ? 'paid off' : `${fmt.curr(remaining)} remaining`;
	if (rate > 0) {
		return `${label} · ${balancePart} · ${rate}%`;
	}
	return `${label} · ${balancePart}`;
}
