export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  accountId?: string; // Links to BankAccount ID if present
  createdAt: number;
}

export interface MonthData {
  id: string; // "2026-06"
  openingBalance: number;
  transactions: Transaction[];
}
