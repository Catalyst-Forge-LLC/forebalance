export function forecastBlockReason(raw: string | null | undefined): string {
	if (!raw?.trim()) {
		return 'This set is empty. Add a balance line on Entries to start a forecast.';
	}

	const hasMain = raw.split('\n').some((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) return false;
		return /^B-[^|\s]+-main\|/i.test(trimmed);
	});

	if (!hasMain) {
		return 'Add a main-account balance line like B-CHCK1234-main|2026-09-01|1000|Checking.';
	}

	return 'This set could not be forecast. Check the warnings under the editor on Entries.';
}
