/** Local calendar YYYY-MM-DD (avoids UTC day-shift from toISOString). */
export function localIsoDate(val?: Date | null): string {
	const date = val ?? new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function isLastDayToken(datePart: string): boolean {
	return /^\d{4}-\d{1,2}-L$/i.test(datePart.trim());
}

export function isPlainDateToken(datePart: string): boolean {
	return /^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart.trim());
}
