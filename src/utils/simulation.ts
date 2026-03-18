import type { PlannerInputs, SimResult, DebtFreeResult, TimelineEvent } from '../types';

export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

// DUO repayment calculation (Netherlands student loans)
// Threshold = 84% of WML (statutory minimum wage) — updated annually by DUO
// Interest is added monthly as annualRate / 12 (simple, not compound)
export const DUO_THRESHOLD = 22_452; // 84% of WML 2025 (€26,728/yr)
export const DUO_RATE      = 0.04;   // 4% of income above threshold

export function duoMonthlyPayment(annualGrossIncome: number, threshold = DUO_THRESHOLD): number {
  return Math.max(0, (annualGrossIncome - threshold) * DUO_RATE / 12);
}

export function duoPlanYears(plan: 'manual' | 'sf15' | 'sf35'): number {
  if (plan === 'sf15') return 15;
  if (plan === 'sf35') return 35;
  return 0; // manual: no forgiveness
}

interface ActiveDeposito {
  id: string;
  maturityMonth: number;
  balance: number;
  monthlyRate: number;
}

export function runSimulation(inputs: PlannerInputs): SimResult {
  const {
    years, revInit, extInit, debtInit, stockInit,
    revMo: revMoBase, extMo, debtMo, stockMo, raiseRate,
    revRate1, revRate2, revTier, extRate, debtRate, stockRate,
    debtPlan = 'manual', grossIncome = 0,
    bufferAmount = 0, bufferOverflow = 'ext',
    events,
  } = inputs;

  const totalMonths    = years * 12;
  const rR1 = monthlyRate(revRate1);
  const rR2 = monthlyRate(revRate2);
  const eR  = monthlyRate(extRate);
  // DUO interest: annual rate / 12 (simple, not compound) — as per DUO policy
  const dR  = debtPlan !== 'manual' ? debtRate / 100 / 12 : monthlyRate(debtRate);
  const sR  = monthlyRate(stockRate);
  // Forgiveness: remaining debt is cancelled after the plan period
  const forgivenessMonth = debtPlan !== 'manual' ? duoPlanYears(debtPlan) * 12 : null;

  let rev   = revInit;
  let ext   = extInit;
  let debt  = debtInit;
  let stock = stockInit;

  const activeDepositos: ActiveDeposito[] = [];

  const wealthHist:   number[] = [];
  const debtHist:     number[] = [];
  const assetHist:    number[] = [];
  const stockHist:    number[] = [];
  const depositoHist: number[] = [];
  let debtFreeMonth: number | null = debt <= 0 ? 0 : null;

  // Pre-group events by the month they fire (year 1 = month 0, year 2 = month 12, ...)
  const eventsByMonth = new Map<number, TimelineEvent[]>();
  for (const ev of events) {
    const m = (ev.year - 1) * 12;
    const arr = eventsByMonth.get(m) ?? [];
    arr.push(ev);
    eventsByMonth.set(m, arr);
  }

  for (let m = 0; m <= totalMonths; m++) {
    const totalDep = activeDepositos.reduce((s, d) => s + d.balance, 0);
    wealthHist.push(Math.round(rev + ext + stock + totalDep - debt));
    debtHist.push(Math.round(debt));
    assetHist.push(Math.round(rev + ext + stock + totalDep));
    stockHist.push(Math.round(stock));
    depositoHist.push(Math.round(totalDep));

    if (m < totalMonths) {
      const yearIndex        = Math.floor(m / 12);
      const raiseFactor      = Math.pow(1 + raiseRate / 100, yearIndex);
      const curRevMoScaled   = revMoBase * raiseFactor;
      const curExtMoScaled   = extMo     * raiseFactor;
      const curStockMoScaled = stockMo   * raiseFactor;
      // DUO payment: recalculate each year from actual gross income of that year.
      // (grossIncome × raiseFactor − threshold) × 4% / 12
      // Because the threshold is fixed, payment grows faster than income.
      const curDebtMoScaled = debtPlan !== 'manual'
        ? Math.max(0, (grossIncome * raiseFactor - DUO_THRESHOLD) * DUO_RATE / 12)
        : debtMo * raiseFactor;

      let currentRevMo = curRevMoScaled;

      // Apply interest
      const tierPart = Math.min(rev, revTier);
      const overPart = Math.max(rev - revTier, 0);
      rev   += tierPart * rR1 + overPart * rR2;
      ext   += ext   * eR;
      stock += stock * sR;

      // Apply interest to depositos and check maturities
      for (const dep of activeDepositos) dep.balance *= (1 + dep.monthlyRate);
      for (let i = activeDepositos.length - 1; i >= 0; i--) {
        if (m + 1 >= activeDepositos[i].maturityMonth) {
          rev += activeDepositos[i].balance;
          activeDepositos.splice(i, 1);
        }
      }

      // Debt repayment
      if (debt > 0) {
        // DUO forgiveness: write off remaining debt at end of plan period
        if (forgivenessMonth !== null && m + 1 >= forgivenessMonth) {
          debt = 0;
          if (debtFreeMonth === null) debtFreeMonth = m + 1;
          currentRevMo += curDebtMoScaled; // repayment freed up
        } else {
          debt = debt * (1 + dR) - curDebtMoScaled;
          if (debt <= 0) {
            debt = 0;
            if (debtFreeMonth === null) debtFreeMonth = m + 1;
          }
        }
      } else {
        currentRevMo += curDebtMoScaled;
      }

      // Monthly contributions — once emergency fund is full, overflow goes to chosen account
      let toRev      = currentRevMo;
      let extOverflow   = 0;
      let stockOverflow = 0;
      if (bufferAmount > 0 && toRev > 0) {
        if (rev >= bufferAmount) {
          // Buffer already full — redirect everything
          if (bufferOverflow === 'stock') stockOverflow = toRev;
          else                            extOverflow   = toRev;
          toRev = 0;
        } else if (rev + toRev > bufferAmount) {
          // This contribution fills the buffer — split at the threshold
          const toFill = bufferAmount - rev;
          const overflow = toRev - toFill;
          toRev = toFill;
          if (bufferOverflow === 'stock') stockOverflow = overflow;
          else                            extOverflow   = overflow;
        }
      }
      rev   += toRev;
      ext   += curExtMoScaled + extOverflow;
      stock += curStockMoScaled + stockOverflow;

      // Process timeline events that fire at the START of the NEXT month (= m+1)
      // Events are indexed by their fire month: (year-1)*12
      const eventsNow = eventsByMonth.get(m + 1) ?? [];
      for (const ev of eventsNow) {
        if (ev.type === 'deposito' && ev.depositoDuration && ev.depositoRate !== undefined) {
          const transfer = Math.min(ev.amount, Math.max(rev, 0));
          rev -= transfer;
          activeDepositos.push({
            id: ev.id,
            maturityMonth: m + 1 + ev.depositoDuration * 12,
            balance: transfer,
            monthlyRate: monthlyRate(ev.depositoRate),
          });
        } else if (ev.type === 'stock_lump') {
          const transfer = Math.min(ev.amount, Math.max(rev, 0));
          rev   -= transfer;
          stock += transfer;
        } else if (ev.type === 'extra_repayment' && debt > 0) {
          const pay = Math.min(ev.amount, debt, Math.max(rev, 0));
          rev  -= pay;
          debt -= pay;
          if (debt <= 0 && debtFreeMonth === null) {
            debt = 0;
            debtFreeMonth = m + 1;
          }
        } else if (ev.type === 'savings_goal') {
          // Deduct from current account only — never touches stocks
          const deduct = Math.min(ev.amount, Math.max(rev, 0));
          rev -= deduct;
        }
      }
    }
  }

  return { wealthHist, debtHist, assetHist, stockHist, depositoHist, debtFreeMonth, finalDebt: debt };
}

export function getDebtFreeResult(simResult: SimResult, inputs: PlannerInputs): DebtFreeResult {
  let { debtFreeMonth } = simResult;

  if (debtFreeMonth === 0) return { key: 'wealthPlanner.debtStatus.none' };

  function monthsToResult(total: number): DebtFreeResult {
    const y = Math.floor(total / 12);
    const mo = total % 12;
    if (y > 0 && mo > 0) return { key: 'wealthPlanner.debtStatus.yearsMonths', years: y, months: mo };
    if (y > 0)           return { key: 'wealthPlanner.debtStatus.years',        years: y };
    return                      { key: 'wealthPlanner.debtStatus.months',        months: mo };
  }

  if (debtFreeMonth !== null) return monthsToResult(debtFreeMonth);

  const { years, debtMo, debtRate, debtPlan = 'manual', grossIncome = 0, raiseRate } = inputs;
  const dR = debtPlan !== 'manual' ? debtRate / 100 / 12 : monthlyRate(debtRate);
  const forgivenessMonth = debtPlan !== 'manual' ? duoPlanYears(debtPlan) * 12 : null;
  let simDebt    = simResult.finalDebt;
  let extraMonth = years * 12;
  const maxSim   = 600;

  while (simDebt > 0 && extraMonth < maxSim) {
    if (forgivenessMonth !== null && extraMonth >= forgivenessMonth) {
      debtFreeMonth = extraMonth;
      break;
    }
    const rf     = Math.pow(1 + raiseRate / 100, Math.floor(extraMonth / 12));
    const payment = debtPlan !== 'manual'
      ? Math.max(0, (grossIncome * rf - DUO_THRESHOLD) * DUO_RATE / 12)
      : debtMo * rf;
    simDebt = simDebt * (1 + dR) - payment;
    extraMonth++;
    if (simDebt <= 0) { debtFreeMonth = extraMonth; break; }
  }

  if (debtFreeMonth !== null) return monthsToResult(debtFreeMonth);
  return { key: 'wealthPlanner.debtStatus.tooLow' };
}

// Simplified simulation for the optimizer (no events, no depositos)
export function simulate(
  revStart: number, extStart: number, debtStart: number, stockStart: number,
  revMo: number,    extMo: number,    debtMo: number,   stockMo: number,
  rR1: number, rR2: number, revTier: number,
  eR: number,  dR: number,  sR: number,
  months: number, raiseRate: number,
): number {
  let rev = revStart, ext = extStart, debt = debtStart, stock = stockStart;
  const rr = raiseRate / 100;

  for (let m = 0; m < months; m++) {
    const rf     = Math.pow(1 + rr, Math.floor(m / 12));
    const sRevMo   = revMo   * rf;
    const sExtMo   = extMo   * rf;
    const sDebtMo  = debtMo  * rf;
    const sStockMo = stockMo * rf;
    let curRevMo   = sRevMo;

    const tp = Math.min(rev, revTier);
    const op = Math.max(rev - revTier, 0);
    rev   += tp * rR1 + op * rR2;
    ext   += ext   * eR;
    stock += stock * sR;

    if (debt > 0) {
      debt = debt * (1 + dR) - sDebtMo;
      if (debt <= 0) debt = 0;
    } else {
      curRevMo += sDebtMo;
    }

    rev   += curRevMo;
    ext   += sExtMo;
    stock += sStockMo;
  }

  return Math.round(rev + ext + stock - debt);
}
