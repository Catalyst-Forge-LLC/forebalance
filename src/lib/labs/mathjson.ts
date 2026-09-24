const OPERATORS = new Set([
	'Add',
	'Subtract',
	'Multiply',
	'Divide',
	'Negate',
	'Sqrt',
	'Abs',
	'Min',
	'Max',
	'Ceil',
	'Floor',
	'Round',
	'Power',
]);

export class MathJsonError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MathJsonError';
	}
}

/** Allowlisted MathJSON. Numbers and names from `variables` only. */
export function evaluateMathJson(formula: unknown, variables: Record<string, number> = {}): number {
	const value = walk(formula, variables, 0);
	if (!Number.isFinite(value)) throw new MathJsonError('Result is not a finite number.');
	return value;
}

function walk(node: unknown, variables: Record<string, number>, depth: number): number {
	if (depth > 32) throw new MathJsonError('Formula is too deep.');
	if (typeof node === 'number') {
		if (!Number.isFinite(node)) throw new MathJsonError('Number is not finite.');
		return node;
	}
	if (typeof node === 'string') {
		if (!Object.prototype.hasOwnProperty.call(variables, node)) {
			throw new MathJsonError(`Unknown symbol ${node}.`);
		}
		const value = variables[node];
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			throw new MathJsonError(`Symbol ${node} is not a finite number.`);
		}
		return value;
	}
	if (!Array.isArray(node) || node.length === 0 || typeof node[0] !== 'string') {
		throw new MathJsonError('Expected a MathJSON array.');
	}
	if (!OPERATORS.has(node[0])) throw new MathJsonError(`Operator not allowed: ${node[0]}.`);
	const args = node.slice(1).map((arg) => walk(arg, variables, depth + 1));
	return apply(node[0], args);
}

function apply(op: string, args: number[]): number {
	switch (op) {
		case 'Add':
			return args.reduce((sum, value) => sum + value, 0);
		case 'Subtract':
			if (args.length < 1) throw new MathJsonError('Subtract needs a value.');
			return args.slice(1).reduce((sum, value) => sum - value, args[0]);
		case 'Multiply':
			return args.reduce((product, value) => product * value, 1);
		case 'Divide': {
			if (args.length < 2) throw new MathJsonError('Divide needs two values.');
			return args.slice(1).reduce((quotient, value) => {
				if (value === 0) throw new MathJsonError('Divide by zero.');
				return quotient / value;
			}, args[0]);
		}
		case 'Negate':
			return unary(op, args, (value) => -value);
		case 'Sqrt':
			return unary(op, args, (value) => {
				if (value < 0) throw new MathJsonError('Square root of a negative number.');
				return Math.sqrt(value);
			});
		case 'Abs':
			return unary(op, args, Math.abs);
		case 'Ceil':
			return unary(op, args, Math.ceil);
		case 'Floor':
			return unary(op, args, Math.floor);
		case 'Round':
			return unary(op, args, Math.round);
		case 'Power':
			if (args.length !== 2) throw new MathJsonError('Power needs two values.');
			return args[0] ** args[1];
		case 'Min':
			if (args.length < 1) throw new MathJsonError('Min needs a value.');
			return Math.min(...args);
		case 'Max':
			if (args.length < 1) throw new MathJsonError('Max needs a value.');
			return Math.max(...args);
		default:
			throw new MathJsonError(`Operator not allowed: ${op}.`);
	}
}

function unary(op: string, args: number[], fn: (value: number) => number): number {
	if (args.length !== 1) throw new MathJsonError(`${op} needs one value.`);
	return fn(args[0]);
}

/** Infix form for the equation line under an answer. */
export function humanizeMathJson(formula: unknown): string {
	if (typeof formula === 'number') return String(formula);
	if (typeof formula === 'string') return formula;
	if (!Array.isArray(formula) || typeof formula[0] !== 'string') return '';
	const [op, ...rest] = formula;
	const parts = rest.map((part) => humanizeMathJson(part));
	if (op === 'Negate') return `−${parts[0] ?? ''}`;
	if (op === 'Sqrt') return `√(${parts[0] ?? ''})`;
	if (op === 'Abs') return `|${parts[0] ?? ''}|`;
	if (op === 'Ceil' || op === 'Floor' || op === 'Round') return `${op.toLowerCase()}(${parts[0] ?? ''})`;
	if (op === 'Power') return `${parts[0] ?? ''} ^ ${parts[1] ?? ''}`;
	const symbol = { Add: '+', Subtract: '−', Multiply: '×', Divide: '÷', Min: 'min', Max: 'max' }[op];
	if (!symbol) return '';
	if (op === 'Min' || op === 'Max') return `${symbol}(${parts.join(', ')})`;
	return parts.join(` ${symbol} `);
}
