export type TimelineEventType = 'deposito' | 'stock_lump' | 'extra_repayment' | 'savings_goal';

export interface TimelineEvent {
  id: string;
  year: number;
  type: TimelineEventType;
  amount: number;
  label?: string;
  depositoDuration?: number;
  depositoRate?: number;
}

export type ExpenseCategory =
  | 'housing' | 'utilities' | 'insurance' | 'subscriptions'
  | 'food' | 'transport' | 'leisure' | 'other';

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
}

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  housing:       '🏠',
  utilities:     '⚡',
  insurance:     '🛡️',
  subscriptions: '📱',
  food:          '🛒',
  transport:     '🚗',
  leisure:       '🎭',
  other:         '📋',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transport', 'utilities',
  'insurance', 'subscriptions', 'leisure', 'other',
];

export type DuoPlan = 'manual' | 'sf15' | 'sf35';

export interface PlannerInputs {
  years:        number;
  grossIncome:  number;   // annual gross income — primary income field
  netIncome:    number;   // net monthly take-home pay (after tax; may be set manually)
  raiseRate:    number;
  expenses:     Expense[]; // monthly fixed + variable expenses
  revInit:      number;
  revMo:        number;
  revRate1:     number;
  revTier:      number;
  revRate2:     number;
  extInit:      number;
  extMo:        number;
  extRate:      number;
  stockInit:    number;
  stockMo:      number;
  stockRate:    number;
  debtInit:     number;
  debtMo:       number;
  debtRate:     number;
  debtPlan:     DuoPlan;  // 'manual' | 'sf15' | 'sf35'
  bufferAmount:   number;
  bufferOverflow: 'ext' | 'stock'; // where revMo goes once emergency fund is full
  events:         TimelineEvent[];
}

export interface SimResult {
  wealthHist:    number[];
  debtHist:      number[];
  assetHist:     number[];
  stockHist:     number[];
  depositoHist:  number[];
  debtFreeMonth: number | null;
  finalDebt:     number;
}

export interface OptimizePayload {
  revStart:     number;
  extStart:     number;
  debtStart:    number;
  stockStart:   number;
  rR1:          number;
  rR2:          number;
  revTier:      number;
  eR:           number;
  dR:           number;
  sR:           number;
  totalBudget:  number;
  simMonths:    number;
  raiseRate:    number;
  curRevMo:     number;
  curExtMo:     number;
  curDebtMo:    number;
  curStockMo:   number;
  bufferAmount: number; // used to set minimum revMo floor
}

export interface OptimizeResult {
  bestRev:       number;
  bestExt:       number;
  bestDebt:      number;
  bestStock:     number;
  bestWealth:    number;
  currentWealth: number;
}

export type DebtFreeResult =
  | { key: 'wealthPlanner.debtStatus.none' }
  | { key: 'wealthPlanner.debtStatus.tooLow' }
  | { key: 'wealthPlanner.debtStatus.yearsMonths'; years: number; months: number }
  | { key: 'wealthPlanner.debtStatus.years';       years: number }
  | { key: 'wealthPlanner.debtStatus.months';      months: number };
