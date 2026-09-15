import { isValidCurrency, normalizeCurrency } from './currencies';

const DASH_HEADER = /^---\s*currency\s*[:=]?\s*([A-Za-z]{3})\b/i;
const HASH_HEADER = /^#\s*(?:@)?currency\s*[:=]\s*([A-Za-z]{3})\b/i;

function matchCurrencyLine(line: string): string | null {
	const trimmed = line.trim();
	const match = DASH_HEADER.exec(trimmed) ?? HASH_HEADER.exec(trimmed);
	if (!match || !isValidCurrency(match[1])) return null;
	return normalizeCurrency(match[1]);
}

/** First `--- currency USD` (or `# currency=USD`) in the text. */
export function extractCurrency(raw: string): string | null {
	for (const line of raw.split(/\r?\n/)) {
		const code = matchCurrencyLine(line);
		if (code) return code;
	}
	return extractCurrencyFromBackupJson(raw);
}

/** All-scenarios JSON backup may carry a top-level currency when the PSV has none. */
export function extractCurrencyFromBackupJson(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{')) return null;
	try {
		const parsed = JSON.parse(trimmed) as { app?: string; currencyIsoCode?: string };
		if (parsed?.app !== 'forebalance') return null;
		if (typeof parsed.currencyIsoCode !== 'string' || !isValidCurrency(parsed.currencyIsoCode)) {
			return null;
		}
		return normalizeCurrency(parsed.currencyIsoCode);
	} catch {
		return null;
	}
}

export function currencyHeaderLine(code: string): string {
	return `--- currency ${normalizeCurrency(code)}`;
}

/** Insert or replace the currency comment so an export always carries one. */
export function ensureCurrencyHeader(raw: string, code: string): string {
	const line = currencyHeaderLine(code);
	const body = raw.replace(/^\uFEFF/, '');
	const lines = body.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		if (matchCurrencyLine(lines[i])) {
			lines[i] = line;
			return lines.join('\n');
		}
	}
	if (!body.trim()) return `${line}\n`;
	return `${line}\n${body.replace(/^\r?\n+/, '')}`;
}
