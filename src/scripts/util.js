import { dev } from '$app/environment';

const freqs = {
  D: 'day',
  W: 'week',
  M: 'month',
  Y: 'year',
};

const defaultFrequency = 'M';

export const getRandomId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};

export const getDate = (rawDate) => {
  if (rawDate === null) {
    return null;
  }
  rawDate = rawDate.split('-');
  return new Date(+rawDate[0], +rawDate[1] - 1, +rawDate[2]);
};

export const parseDate = (rawDate) => {
  if (!rawDate) {
    return;
  }
  rawDate = rawDate.replace(/-R/g, ',R'); // Temp fix for old format
  let [startDate, recur = '', endDate = null] = rawDate.split(',');
  startDate = getDate(startDate);
  endDate = getDate(endDate);
  return [startDate, parseRecur(recur), recur, endDate];
};

export const getBalanceFlag = (bal, balanceFlags) => {
  let balanceFlag = '';
  Object.entries(balanceFlags.below).forEach(([flag, threshold]) => {
    if (balanceFlag === '' && bal < threshold) {
      balanceFlag = flag;
    }
  });
  Object.entries(balanceFlags.above).forEach(([flag, threshold]) => {
    if (balanceFlag === '' && bal > threshold) {
      balanceFlag = flag;
    }
  });
  return balanceFlag;
};

export const sortEntries = (entries) => {
  return entries.toSorted((a, b) => (a.date.valueOf() > b.date.valueOf() ? 1 : a.date.valueOf() === b.date.valueOf() ? (a.type > b.type ? 1 : -1) : -1));
};

export class Recur {
  constructor(freq = defaultFrequency, multiple = 1, count = null, recurRaw = null) {
    this.freq = freq;
    this.multiple = multiple;
    this.count = count;
    this.recurRaw = recurRaw;
  }
}

export const parseRecur = (recur) => {
  if (!recur || recur === '') {
    return null;
  }
  let regexpRecur = /R([0-9]*)([DWMY]?)([0-9]*)/;
  let [recurRaw, multiple, freq, count] = regexpRecur.exec(recur.toUpperCase());
  return new Recur(freq === '' ? 'M' : freq, multiple === '' ? 1 : +multiple, count === '' ? null : +count, recurRaw);
};

export const updateDescRecur = (desc, recur, rIndex) => {
  return desc.replace(/\(#[0-9]+(\/[0-9]+)?\)/g, '') + ` (#${rIndex}${recur.count !== null ? `/${recur.count}` : ''})`;
};

export const updateDateRecur = (date, recur) => {
  let dateRecur = dayjs(date);
  dateRecur = dateRecur.add(recur.multiple, freqs[recur.freq]);
  dateRecur = dateRecur.toDate();
  return dateRecur;
};

export function logd(...args) {
  /*
    Some goodness here now. Calling logd() will log things based on a few conditions.
    The first argument is expected to be a identifier string wrapped in single or double square brackets, like [debug-thing] or [[debug-other-thing]].
    All arguments are cloned so that you can see the values at the time of the log.
    1. If dev is true or if localStorage has a key of 'sk_debug' and the value is 'dev', it will log calls with single square bracket wrapped identifier.
    2. If 'sk_debug' is 'devv', it will log single square bracket wrapped identifier calls with the arguments cloned and traced so you can see the stack trace.
    3. If the identifier is wrapped with double square brackets, 'sk_debug' must be 'devvv' in order to log and trace the call.

    From the browser console, run: localStorage.setItem('sk_debug', 'dev') to enable dev mode logging. Adjust the number of 'v's to increase the verbosity.
  */
  const debug = typeof localStorage === 'object' ? localStorage?.getItem('sk_debug') : '';
  if (args[0] === true) {
    logClonedTraced(true, ...args.slice(1));
  } else if (args[0]?.startsWith('[[')) {
    if (debug === 'devvv') {
      logClonedTraced(...args);
    }
  } else if (dev || debug === 'dev' || debug === 'devv') {
    if (debug === 'devv' || debug === 'devvv') {
      logClonedTraced(...args);
    } else {
      logCloned(...args);
    }
  } else {
    console.log(args[0]);
  }
}
let microtimeLast = new Date().getTime();

function getTimeHeader(event, highlight = false) {
  const now = new Date();
  const microtimeNow = now.getTime();
  const elapsed = microtimeNow - microtimeLast;
  const elapsedThreshold = 500;
  microtimeLast = microtimeNow;
  let header = [`${now.toLocaleTimeString()}.${now.getMilliseconds()} ${event} - ${elapsed}ms`];
  if (highlight || elapsed > elapsedThreshold) {
    header = [`%c${header}`, 'background-color: #FFFFA7; color: #AA5555'];
  }
  return header;
}

export function logCloned() {
  console.groupCollapsed(...getTimeHeader(arguments[0]));
  const remainingArguments = Array.from(arguments).slice(1);
  try {
    console.log(...structuredClone(remainingArguments));
  } catch (e) {
    console.log(...remainingArguments);
  }
  console.groupEnd();
}

export function logClonedTraced() {
  let highlight = false;
  let args = [...arguments];
  if (args[0] === true) {
    highlight = true;
    args = args.slice(1);
  }
  console.groupCollapsed(...getTimeHeader(args[0], highlight));
  const remainingArguments = Array.from(args).slice(1);
  try {
    console.log(...structuredClone(remainingArguments));
    console.trace();
  } catch (e) {
    console.log(...remainingArguments);
    console.trace();
  }
  console.groupEnd();
}
