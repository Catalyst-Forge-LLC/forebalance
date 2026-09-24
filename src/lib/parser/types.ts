import type { BusinessDayShift } from './businessDays';

export type EntryType = 'B' | 'C' | 'D' | 'G';

export type PaymentStrategy = 'fixed' | 'min' | 'pct';

/** Used when STRATEGY is `min` and the line has no MIN_RATE. `0.02` would mean 2%. */
export const DEFAULT_MIN_RATE = 0.1;

export type BalanceFlag = '' | 'negative' | 'low' | 'uncomfortable' | 'goal' | 'paid-off';

export interface Recur {
	freq: 'D' | 'W' | 'M' | 'Y';
	multiple: number;
	count: number | null;
	recurRaw: string | null;
	lastDayOfMonth?: boolean;
	/** Compound raise, e.g. `+3%Y` grows the line amount 3% each year. */
	raise?: { percent: number; every: 'D' | 'W' | 'M' | 'Y' };
}

export interface Account {
	id: string;
	isMain: boolean;
	startingBal: number;
	runningBal: number;
	name?: string;
	lastFour?: string;
	interestRate?: number;
	interestRate2?: number;
	interestRate2Date?: string | null;
	extraPayment?: number;
	balanceIndex?: number;
	strategy?: PaymentStrategy;
	/** Fraction of remaining balance. Absent means DEFAULT_MIN_RATE when strategy is min. */
	minRate?: number;
	payUrl?: string;
	notes?: string;
	categoryId?: string;
	autopay?: boolean;
}

export interface OccurrenceOverride {
	date?: string;
	amount?: number;
	/** Still apply this occurrence even when the same-day B amount already includes the rest. */
	pending?: boolean;
}

export interface ParsedEntry {
	id: string;
	type: EntryType;
	date: Date | null;
	amount: number | string;
	desc: string | null;
	accountId?: string;
	endDate: Date | null;
	rawEntry: string;
	isMain: boolean;
	recur: Recur | null;
	rawRecur?: string;
	group?: string;
	balance?: number;
	mainBalance?: number;
	formattedDate?: string;
	formattedCredit?: string;
	formattedDebit?: string;
	formattedBalance?: string;
	flag?: BalanceFlag;
	monthlyInterest?: number;
	subAccountRunningBal?: number;
	entryOrder?: number;
	businessDayShift?: BusinessDayShift;
	occurrenceIndex?: number;
	seriesDate?: Date | null;
	/** First occurrence, before a fast-forward jump. Raise is measured from here. */
	seriesOrigin?: Date | null;
	baseAmount?: number;
	overrides?: Record<number, OccurrenceOverride>;
	overridden?: boolean;
	/** Same-day item on a balance date that the B amount already reflects. Shown, but does not move the balance. */
	inBalance?: boolean;
	/** Same calendar day as a main-account B while the end-of-day setting is on. */
	inBalanceEligible?: boolean;
	/** Override: apply this occurrence even though it is same-day as B. */
	pending?: boolean;
	strategy?: PaymentStrategy;
	minRate?: number;
	payUrl?: string;
	notes?: string;
	categoryId?: string;
	autopay?: boolean;
}

export interface BalanceFlags {
	below: {
		negative: number;
		low: number;
		uncomfortable: number;
	};
	above: {
		goal: number;
	};
}

export type AccountEntries = Record<string, ParsedEntry[]>;
export type Accounts = Record<string, Account>;

export interface Settings {
	thresholdGoalBalance: number;
	thresholdUncomfortableBalance: number;
	thresholdLowBalance: number;
	monthsToForecast: number;
	locale: string;
	currencyIsoCode: string;
	useFederalHolidays: boolean;
	/** Treat a B amount as the end-of-day number: same-day credits and debits are already in it. */
	balanceIncludesSameDay: boolean;
	/** @deprecated Migrated into named entry sets. Kept so old localStorage still parses. */
	useDemoEntries?: boolean;
}

export interface ParseOptions {
	useFederalHolidays?: boolean;
	balanceIncludesSameDay?: boolean;
}

export type ParseResult = [AccountEntries | null, Accounts | null];
