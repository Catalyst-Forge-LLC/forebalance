/** First day of the current month as YYYY-MM- */
export function currentMonthPrefix(now = new Date()): string {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}-`;
}

export interface EntryTemplate {
	id: string;
	name: string;
	blurb: string;
	build: (monthPrefix?: string) => string;
}

function closeMonth(p: string): string {
	return `B-CHCK1775-main|${p}01|1840|Balance Checking 1775
--- Income
C|${p}01,R2W|1684|Paycheck
--- Housing
D|${p}01,R<|1645|Rent
D|${p}03,R|42|Renters insurance
--- Food
D|${p}02,RW|92|Groceries
D|${p}05,RW|28|Lunch out
--- Transport
D|${p}10,R|428|Car payment
D|${p}15,R|156|Car insurance
D|${p}04,RW|38|Gas
--- Utilities
D|${p}08,R|142|Electric
D|${p}12,R|76|Phone
D|${p}07,R|72|Internet
--- Debt
D-CAP1|${p}18,R|75|Capital One-4321|CAP1|2140|22.99
--- Buffer
D|${p}22,R|50|Savings
`;
}

function variablePay(p: string): string {
	return `B-CHCK2201-main|${p}01|1720|Balance Checking 2201
--- Income
C|${p}03,R|520|Gig week
C|${p}10,R|410|Gig week
C|${p}17,R|680|Gig week
C|${p}24,R|490|Gig week
--- Housing
D|${p}01,R<|1185|Rent
--- Food
D|${p}02,RW|72|Groceries
D|${p}06,RW|18|Coffee / snacks
--- Transport
D|${p}01,R|92|Transit pass
--- Utilities
D|${p}09,R|98|Electric
D|${p}14,R|58|Phone
D|${p}07,R|55|Internet
--- Debt
D-SYNC|${p}20,R|65|Synchrony-8802|SYNC|1640|27.49
`;
}

function household(p: string): string {
	return `B-CHCK3344-main|${p}01|2150|Balance Checking 3344
--- Income
C|${p}01,R2W|1920|Paycheck A
C|${p}08,R2W|1485|Paycheck B
--- Housing
D|${p}01,R<|2180|Rent
D|${p}05,R|38|Renters insurance
--- Kids
D|${p}01,R|1125|Childcare
D|${p}12,R|65|Kids activities
--- Food
D|${p}02,RW|165|Groceries
D|${p}04,RW|40|School lunches / snacks
--- Transport
D|${p}10,R|465|Car payment
D|${p}16,R|198|Car insurance
D|${p}03,RW|52|Gas
--- Utilities
D|${p}08,R|186|Electric
D|${p}11,R|92|Phones
D|${p}07,R|79|Internet
--- Debt
D-VISA|${p}21,R|95|Visa-1190|VISA|3680|21.49
`;
}

function debtFocus(p: string): string {
	return `B-CHCK5510-main|${p}01|1260|Balance Checking 5510
--- Income
C|${p}01,R2W|1742|Paycheck
--- Housing
D|${p}01,R<|1520|Rent
--- Food
D|${p}02,RW|88|Groceries
--- Transport
D|${p}05,R|86|Bus / rides
--- Utilities
D|${p}08,R|124|Electric
D|${p}12,R|70|Phone
D|${p}07,R|70|Internet
--- Debt
D-CAP1|${p}15,R|80|Capital One-4321|CAP1|2860|22.99
D-CARE|${p}18,R|45|CareCredit-7740|CARE|940|26.99
D-STLN|${p}22,R|268|Student loan-2016|STLN|18400|6.53
`;
}

export const entryTemplates: EntryTemplate[] = [
	{
		id: 'close-month',
		name: 'Close month',
		blurb: 'Single renter on a biweekly paycheck. Rent hits first; a thin buffer and one card.',
		build: (monthPrefix = currentMonthPrefix()) => closeMonth(monthPrefix),
	},
	{
		id: 'variable-pay',
		name: 'Variable pay',
		blurb: 'Gig weeks that swing. Rent week is tight; later weeks catch up. Transit instead of a car, one high-APR card.',
		build: (monthPrefix = currentMonthPrefix()) => variablePay(monthPrefix),
	},
	{
		id: 'household',
		name: 'Two-paycheck household',
		blurb: 'Two incomes, rent, childcare, and a bigger grocery bill. Tight around the 1st.',
		build: (monthPrefix = currentMonthPrefix()) => household(monthPrefix),
	},
	{
		id: 'debt-focus',
		name: 'Debt focus',
		blurb: 'One paycheck covering rent plus three debts — card, medical, student loan.',
		build: (monthPrefix = currentMonthPrefix()) => debtFocus(monthPrefix),
	},
];

export const defaultTemplateId = 'close-month';

export function getTemplate(id: string): EntryTemplate {
	return entryTemplates.find((template) => template.id === id) ?? entryTemplates[0];
}

export function buildDefaultEntries(monthPrefix = currentMonthPrefix()): string {
	return getTemplate(defaultTemplateId).build(monthPrefix);
}
