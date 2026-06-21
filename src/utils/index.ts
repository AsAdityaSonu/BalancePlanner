import { MonthData } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Returns "2026-06" for current month */
export const getCurrentMonthId = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/** "2026-06" → "June 2026" */
export const getMonthLabel = (id: string): string => {
  const [y, m] = id.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

/** "2026-06" → "2026-05" */
export const getPrevMonthId = (id: string): string => {
  const [y, m] = id.split('-').map(Number);
  const date = new Date(y, m - 2, 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
};

/** "2026-06" → "2026-07" */
export const getNextMonthId = (id: string): string => {
  const [y, m] = id.split('-').map(Number);
  const date = new Date(y, m, 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
};

/** Format as ₹1,23,456 */
export const formatCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN');
  return `₹${formatted}`;
};

/** Compute closing balance of a month */
export const getClosingBalance = (data: MonthData): number => {
  return data.transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, data.openingBalance);
};

/** Get running balance after each transaction */
export const getRunningBalances = (
  data: MonthData,
): Array<{ runningBalance: number } & MonthData['transactions'][0]> => {
  let running = data.openingBalance;
  return data.transactions.map(t => {
    running = t.type === 'income' ? running + t.amount : running - t.amount;
    return { ...t, runningBalance: running };
  });
};
