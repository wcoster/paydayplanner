import type { PlannerInputs, SimResult, DebtFreeResult } from '../types';

export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export function runSimulation(inputs: PlannerInputs): SimResult {
  const {
    years, revInit, extInit, debtInit,
    revMo: revMoBase, extMo, debtMo, raiseRate,
    revRate1, revRate2, revTier, extRate, debtRate,
  } = inputs;

  const totalMonths = years * 12;
  const rR1 = monthlyRate(revRate1);
  const rR2 = monthlyRate(revRate2);
  const eR  = monthlyRate(extRate);
  const dR  = monthlyRate(debtRate);

  let rev  = revInit;
  let ext  = extInit;
  let debt = debtInit;

  const wealthHist: number[] = [];
  const debtHist:   number[] = [];
  const assetHist:  number[] = [];
  let debtFreeMonth: number | null = debt <= 0 ? 0 : null;

  for (let m = 0; m <= totalMonths; m++) {
    wealthHist.push(Math.round(rev + ext - debt));
    debtHist.push(Math.round(debt));
    assetHist.push(Math.round(rev + ext));

    if (m < totalMonths) {
      const yearIndex      = Math.floor(m / 12);
      const raiseFactor    = Math.pow(1 + raiseRate / 100, yearIndex);
      const curRevMoScaled  = revMoBase * raiseFactor;
      const curExtMoScaled  = extMo     * raiseFactor;
      const curDebtMoScaled = debtMo    * raiseFactor;

      let currentRevMo = curRevMoScaled;

      const tierPart = Math.min(rev, revTier);
      const overPart = Math.max(rev - revTier, 0);
      rev += tierPart * rR1 + overPart * rR2;
      ext += ext * eR;

      if (debt > 0) {
        debt = debt * (1 + dR) - curDebtMoScaled;
        if (debt <= 0) {
          debt = 0;
          if (debtFreeMonth === null) debtFreeMonth = m + 1;
        }
      } else {
        currentRevMo += curDebtMoScaled;
      }

      rev += currentRevMo;
      ext += curExtMoScaled;
    }
  }

  return { wealthHist, debtHist, assetHist, debtFreeMonth, finalDebt: debt };
}

export function getDebtFreeResult(simResult: SimResult, inputs: PlannerInputs): DebtFreeResult {
  let { debtFreeMonth } = simResult;

  if (debtFreeMonth === 0) return { key: 'wealthPlanner.debtStatus.none' };

  function monthsToResult(total: number): DebtFreeResult {
    const y = Math.floor(total / 12);
    const m = total % 12;
    if (y > 0 && m > 0) return { key: 'wealthPlanner.debtStatus.yearsMonths', years: y, months: m };
    if (y > 0)          return { key: 'wealthPlanner.debtStatus.years',        years: y };
    return                     { key: 'wealthPlanner.debtStatus.months',        months: m };
  }

  if (debtFreeMonth !== null) return monthsToResult(debtFreeMonth);

  const { years, debtMo, debtRate, raiseRate } = inputs;
  const dR = monthlyRate(debtRate);
  let simDebt    = simResult.finalDebt;
  let extraMonth = years * 12;
  const maxSim   = 600;

  while (simDebt > 0 && extraMonth < maxSim) {
    const rf = Math.pow(1 + raiseRate / 100, Math.floor(extraMonth / 12));
    simDebt = simDebt * (1 + dR) - debtMo * rf;
    extraMonth++;
    if (simDebt <= 0) { debtFreeMonth = extraMonth; break; }
  }

  if (debtFreeMonth !== null) return monthsToResult(debtFreeMonth);
  return { key: 'wealthPlanner.debtStatus.tooLow' };
}

export function simulate(
  revStart: number, extStart: number, debtStart: number,
  revMo: number,    extMo: number,    debtMo: number,
  rR1: number, rR2: number, revTier: number,
  eR: number,  dR: number,
  months: number, raiseRate: number,
): number {
  let rev = revStart, ext = extStart, debt = debtStart;
  const rr = raiseRate / 100;

  for (let m = 0; m < months; m++) {
    const rf    = Math.pow(1 + rr, Math.floor(m / 12));
    const sRevMo  = revMo  * rf;
    const sExtMo  = extMo  * rf;
    const sDebtMo = debtMo * rf;
    let curRevMo  = sRevMo;

    const tp = Math.min(rev, revTier);
    const op = Math.max(rev - revTier, 0);
    rev += tp * rR1 + op * rR2;
    ext += ext * eR;

    if (debt > 0) {
      debt = debt * (1 + dR) - sDebtMo;
      if (debt <= 0) debt = 0;
    } else {
      curRevMo += sDebtMo;
    }

    rev += curRevMo;
    ext += sExtMo;
  }

  return Math.round(rev + ext - debt);
}
