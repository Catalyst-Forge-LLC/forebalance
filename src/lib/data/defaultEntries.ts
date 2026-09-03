const monthPrefix = new Date().toISOString().split('T')[0].replace(/-\d{2}$/, '-');

export const defaultEntries = `B-CHCK5432-main|${monthPrefix}01|1000|Balance Checking 5432
--- Income
C|${monthPrefix}01,R2W|1500|Paycheck every other week
--- Expenses
D|${monthPrefix}01,R|1000|Rent
D|${monthPrefix}01,RW|125|Weekly Food
D|${monthPrefix}01,RW|50|Misc
D|${monthPrefix}16,R|500|Savings
D|${monthPrefix}10,R|250|Car Payment
--- Expenses:Utilities
D|${monthPrefix}01,RW|25|Gas
D|${monthPrefix}25,R|150|Electric
D|${monthPrefix}25,R|100|Cell phone
D|${monthPrefix}07,R|75|Internet
--- Expenses:Entertainment
D|${monthPrefix}25,R|15|Hulu
D|${monthPrefix}01,R|15|Netflix
--- Debt
`;
