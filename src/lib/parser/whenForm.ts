import { parseRecur } from './recurrence';

export type RepeatKind = 'once' | 'D' | 'W' | 'M' | 'Y';

export interface WhenForm {
	raw: boolean;
	date: string;
	lastDay: boolean;
	repeat: RepeatKind;
	every: number;
	times: string;
	end: string;
	shift: '' | '<' | '>';
}

const EMPTY: WhenForm = {
	raw: true,
	date: '',
	lastDay: false,
	repeat: 'once',
	every: 1,
	times: '',
	end: '',
	shift: '',
};

function pad(value: string): string {
	return value.padStart(2, '0');
}

function takeShift(token: string): { text: string; shift: '' | '<' | '>' } {
	if (token.endsWith('<')) return { text: token.slice(0, -1), shift: '<' };
	if (token.endsWith('>')) return { text: token.slice(0, -1), shift: '>' };
	return { text: token, shift: '' };
}

export function readWhenForm(when: string): WhenForm {
	const normalized = when.trim().replace(/-R/g, ',R');
	const parts = normalized.split(',');
	if (parts.length > 3) return { ...EMPTY };
	const [startRaw = '', recurPart = '', endPart = ''] = parts;
	const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2}|L)$/i.exec(startRaw);
	if (!dateMatch) return { ...EMPTY };
	const lastOnDate = dateMatch[3].toUpperCase() === 'L';
	const date = `${dateMatch[1]}-${pad(dateMatch[2])}-${lastOnDate ? '01' : pad(dateMatch[3])}`;
	const recurShift = takeShift(recurPart);
	const endShift = takeShift(endPart);
	const parsed = recurShift.text ? parseRecur(recurShift.text) : null;
	if (recurShift.text && !parsed) return { ...EMPTY };
	return {
		raw: false,
		date,
		lastDay: lastOnDate || !!parsed?.lastDayOfMonth,
		repeat: parsed ? parsed.freq : 'once',
		every: parsed?.multiple ?? 1,
		times: parsed?.count ? String(parsed.count) : '',
		end: endShift.text,
		shift: recurShift.shift || endShift.shift,
	};
}

export function writeWhenForm(form: WhenForm): string {
	const [year = '', month = ''] = form.date.split('-');
	const start = form.lastDay && (form.repeat === 'once' || form.repeat === 'M') ? `${year}-${month}-L` : form.date;
	if (form.repeat === 'once') return start;
	const every = Math.max(1, Math.floor(Number(form.every) || 1));
	const times = form.times.trim();
	let token: string;
	if (form.lastDay && form.repeat === 'M') {
		token = every === 1 ? 'RML' : `R${every}ML`;
	} else {
		const multiple = every === 1 ? '' : String(every);
		const freq = form.repeat === 'M' && every === 1 ? '' : form.repeat;
		token = `R${multiple}${freq}${times}`;
	}
	if (form.shift) token += form.shift;
	return form.end ? `${start},${token},${form.end}` : `${start},${token}`;
}

export function everyUnit(form: WhenForm): string {
	const many = form.every > 1;
	if (form.repeat === 'D') return many ? 'days' : 'day';
	if (form.repeat === 'W') return many ? 'weeks' : 'week';
	if (form.repeat === 'Y') return many ? 'years' : 'year';
	return many ? 'months' : 'month';
}
