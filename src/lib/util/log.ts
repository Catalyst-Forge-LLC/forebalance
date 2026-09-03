import { dev } from '$app/environment';

export function logd(...args: unknown[]): void {
	const debug = typeof localStorage === 'object' ? localStorage?.getItem('sk_debug') : '';
	if (args[0] === true) {
		logClonedTraced(true, ...args.slice(1));
	} else if (typeof args[0] === 'string' && args[0].startsWith('[[')) {
		if (debug === 'devvv') {
			logClonedTraced(...args);
		}
	} else if (dev || debug === 'dev' || debug === 'devv') {
		if (debug === 'devv' || debug === 'devvv') {
			logClonedTraced(...args);
		} else {
			logCloned(...args);
		}
	} else if (typeof args[0] === 'string') {
		console.log(args[0]);
	}
}

let microtimeLast = new Date().getTime();

function getTimeHeader(event: unknown, highlight = false): [string] | [string, string] {
	const now = new Date();
	const microtimeNow = now.getTime();
	const elapsed = microtimeNow - microtimeLast;
	const elapsedThreshold = 500;
	microtimeLast = microtimeNow;
	let header = [`${now.toLocaleTimeString()}.${now.getMilliseconds()} ${event} - ${elapsed}ms`];
	if (highlight || elapsed > elapsedThreshold) {
		header = [`%c${header}`, 'background-color: #FFFFA7; color: #AA5555'];
	}
	return header as [string] | [string, string];
}

export function logCloned(...args: unknown[]): void {
	console.groupCollapsed(...getTimeHeader(args[0]));
	const remainingArguments = Array.from(args).slice(1);
	try {
		console.log(...structuredClone(remainingArguments));
	} catch {
		console.log(...remainingArguments);
	}
	console.groupEnd();
}

export function logClonedTraced(...args: unknown[]): void {
	let highlight = false;
	let logArgs = [...args];
	if (logArgs[0] === true) {
		highlight = true;
		logArgs = logArgs.slice(1);
	}
	console.groupCollapsed(...getTimeHeader(logArgs[0], highlight));
	const remainingArguments = Array.from(logArgs).slice(1);
	try {
		console.log(...structuredClone(remainingArguments));
		console.trace();
	} catch {
		console.log(...remainingArguments);
		console.trace();
	}
	console.groupEnd();
}
