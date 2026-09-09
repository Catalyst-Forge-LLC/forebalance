import type { BusinessDayShift } from './businessDays';

export type EntryType = 'B' | 'C' | 'D' | 'G';

export type BalanceFlag = '' | 'negative' | 'low' | 'uncomfortable' | 'goal' | 'paid-off';

export interface Recur {
	freq: 'D' | 'W' | 'M' | 'Y';
	multiple: number;
	count: number | null;
	recurRaw: string | null;
	lastDayOfMonth?: boolean;
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
	/** @deprecated Migrated into named entry sets. Kept so old localStorage still parses. */
	useDemoEntries?: boolean;
}

export interface ParseOptions {
	useFederalHolidays?: boolean;
}

export interface EntryInputs {
	desc: string;
	amount: number;
	date: string;
	type: string;
}

export type ParseResult = [AccountEntries | null, Accounts | null];
