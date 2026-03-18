/// <reference lib="webworker" />
import { simulate } from '../utils/simulation';
import type { OptimizePayload, OptimizeResult } from '../types';

self.onmessage = (e: MessageEvent<OptimizePayload>) => {
  const {
    revStart, extStart, debtStart, stockStart,
    rR1, rR2, revTier, eR, dR, sR,
    totalBudget, simMonths, raiseRate,
    curRevMo, curExtMo, curDebtMo, curStockMo,
    bufferAmount,
  } = e.data;

  const currentWealth = simulate(
    revStart, extStart, debtStart, stockStart,
    curRevMo, curExtMo, curDebtMo, curStockMo,
    rR1, rR2, revTier, eR, dR, sR,
    simMonths, raiseRate,
  );

  const step = totalBudget > 3000 ? 100 : totalBudget > 1500 ? 50 : 20;

  // Minimum monthly to current account: enough to fill the buffer within the plan
  // period (capped at 30% of budget so it doesn't dominate small budgets).
  const bufferGap = Math.max(0, bufferAmount - revStart);
  const rawRevMin = simMonths > 0 ? bufferGap / simMonths : 0;
  const revMin    = Math.min(
    Math.ceil(rawRevMin / step) * step,
    Math.floor(totalBudget * 0.30 / step) * step,
  );

  let bestWealth = -Infinity;
  let bestRev = 0, bestExt = 0, bestStock = 0, bestExtraDebt = 0;

  // Mandatory debt payment (curDebtMo) is a fixed expense already excluded from
  // totalBudget. The extra-debt loop optimises voluntary overpayments on top.
  for (let d = 0; d <= totalBudget; d += step) {
    for (let r = revMin; r <= totalBudget - d; r += step) {
      for (let s = 0; s <= totalBudget - d - r; s += step) {
        const ex = totalBudget - d - r - s;
        const w  = simulate(
          revStart, extStart, debtStart, stockStart,
          r, ex, curDebtMo + d, s,
          rR1, rR2, revTier, eR, dR, sR,
          simMonths, raiseRate,
        );
        if (w > bestWealth) { bestWealth = w; bestRev = r; bestExt = ex; bestExtraDebt = d; bestStock = s; }
      }
    }
  }

  const result: OptimizeResult = { bestRev, bestExt, bestStock, bestExtraDebt, bestWealth, currentWealth };
  (self as DedicatedWorkerGlobalScope).postMessage(result);
};
