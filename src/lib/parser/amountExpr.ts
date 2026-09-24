/** Amount field arithmetic. Numbers and + - * / ( ) only. */
export function evaluateAmount(raw: string): number | null {
	const text = raw.trim().replace(/[$€£,\s]/g, '');
	if (text === '') return null;
	if (/^-?\d+(?:\.\d+)?$/.test(text)) return +text;
	if (!/^[\d+\-*/().]+$/.test(text)) return null;
	let index = 0;
	function peek(): string {
		return text[index] ?? '';
	}
	function parseFactor(): number {
		if (peek() === '(') {
			index += 1;
			const value = parseExpr();
			if (peek() === ')') index += 1;
			return value;
		}
		const start = index;
		if (peek() === '+' || peek() === '-') index += 1;
		while (/[\d.]/.test(peek())) index += 1;
		const number = +text.slice(start, index);
		if (Number.isNaN(number) || start === index) throw new Error('bad amount');
		return number;
	}
	function parseTerm(): number {
		let value = parseFactor();
		while (peek() === '*' || peek() === '/') {
			const op = peek();
			index += 1;
			const right = parseFactor();
			value = op === '*' ? value * right : value / right;
		}
		return value;
	}
	function parseExpr(): number {
		let value = parseTerm();
		while (peek() === '+' || peek() === '-') {
			const op = peek();
			index += 1;
			const right = parseTerm();
			value = op === '+' ? value + right : value - right;
		}
		return value;
	}
	try {
		const value = parseExpr();
		if (index !== text.length || !Number.isFinite(value)) return null;
		return value;
	} catch {
		return null;
	}
}
