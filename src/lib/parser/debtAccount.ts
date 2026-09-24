import type { SourceLine } from '$lib/parser/sourceLines';

/** Stable account id for a debt line that has a balance or APR but no account yet. */
export function debtAccountId(desc: string): string {
	const slug = desc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
	return slug || 'LOAN';
}

export function debtAccountKey(line: SourceLine): string {
	return (line.accountSuffix || line.extras.accountSlot || '').toUpperCase();
}

/** A debit with a starting balance or APR is a debt even before it has an account id. */
export function ensureDebtAccount(line: SourceLine): string {
	const existing = debtAccountKey(line);
	if (existing) return existing;
	if (line.type !== 'D') return '';
	const balance = line.extras.startingBal;
	const apr = line.extras.apr;
	const hasDebt =
		(balance !== undefined && String(balance) !== '' && !Number.isNaN(+balance)) ||
		(apr !== undefined && String(apr) !== '' && !Number.isNaN(+apr));
	if (!hasDebt) return '';
	const slot = debtAccountId(line.desc);
	line.extras.accountSlot = slot;
	return slot;
}
