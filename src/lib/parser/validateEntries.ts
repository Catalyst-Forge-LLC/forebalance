import { parseOverrideField } from '$lib/parser/occurrenceEdit';

export interface EntryValidation {
	line: number;
	message: string;
}

function isDisabledLine(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.startsWith('!') || trimmed.startsWith('#');
}

export function validateRawEntries(raw: string): EntryValidation[] {
	const warnings: EntryValidation[] = [];

	raw.split('\n').forEach((line, index) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('---') || isDisabledLine(trimmed)) {
			return;
		}

		const parts = trimmed.split('|');
		if (parts.length < 4) {
			warnings.push({
				line: index + 1,
				message: 'Expected TYPE|WHEN|AMOUNT|DESCRIPTION',
			});
			return;
		}

		const typeCode = parts[0].toUpperCase().split('-')[0];
		if (!['B', 'C', 'D'].includes(typeCode)) {
			warnings.push({ line: index + 1, message: `Unknown type "${typeCode}"` });
		}

		const datePart = parts[1]?.split(',')[0] ?? '';
		if (datePart && !/^\d{4}-\d{1,2}-(?:\d{1,2}|L)$/i.test(datePart)) {
			warnings.push({ line: index + 1, message: `Invalid date "${datePart}"` });
		}

		if (parts[2] !== '' && Number.isNaN(+parts[2])) {
			warnings.push({ line: index + 1, message: `Amount is not a number: "${parts[2]}"` });
		}

		for (const field of parts.slice(4)) {
			if (/^#\d+/.test(field) && !parseOverrideField(field)) {
				warnings.push({
					line: index + 1,
					message: `Invalid occurrence override "${field}"`,
				});
			}
		}
	});

	return warnings;
}

export function isEntryLineDisabled(line: string): boolean {
	return isDisabledLine(line);
}

export function stripDisabledPrefix(line: string): string {
	const trimmed = line.trim();
	if (trimmed.startsWith('!') || trimmed.startsWith('#')) {
		return trimmed.slice(1).trimStart();
	}
	return line;
}
