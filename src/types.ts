export interface PlannerInputs {
  years: number;
  freeIncome: number;
  raiseRate: number;
  revInit: number;
  revMo: number;
  revRate1: number;
  revTier: number;
  revRate2: number;
  extInit: number;
  extMo: number;
  extRate: number;
  debtInit: number;
  debtMo: number;
  debtRate: number;
}

export interface SimResult {
  wealthHist: number[];
  debtHist: number[];
  assetHist: number[];
  debtFreeMonth: number | null;
  finalDebt: number;
}

export interface OptimizePayload {
  revStart: number;
  extStart: number;
  debtStart: number;
  rR1: number;
  rR2: number;
  revTier: number;
  eR: number;
  dR: number;
  totalBudget: number;
  simMonths: number;
  raiseRate: number;
  curRevMo: number;
  curExtMo: number;
  curDebtMo: number;
}

export interface OptimizeResult {
  bestRev: number;
  bestExt: number;
  bestDebt: number;
  bestWealth: number;
  currentWealth: number;
}

export type DebtFreeResult =
  | { key: 'wealthPlanner.debtStatus.none' }
  | { key: 'wealthPlanner.debtStatus.tooLow' }
  | { key: 'wealthPlanner.debtStatus.yearsMonths'; years: number; months: number }
  | { key: 'wealthPlanner.debtStatus.years';       years: number }
  | { key: 'wealthPlanner.debtStatus.months';      months: number };
