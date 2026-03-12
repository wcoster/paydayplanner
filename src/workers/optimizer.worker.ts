/// <reference lib="webworker" />
import { simulate } from '../utils/simulation';
import type { OptimizePayload, OptimizeResult } from '../types';

self.onmessage = (e: MessageEvent<OptimizePayload>) => {
  const {
    revStart, extStart, debtStart,
    rR1, rR2, revTier, eR, dR,
    totalBudget, simMonths, raiseRate,
    curRevMo, curExtMo, curDebtMo,
  } = e.data;

  const currentWealth = simulate(
    revStart, extStart, debtStart,
    curRevMo, curExtMo, curDebtMo,
    rR1, rR2, revTier, eR, dR,
    simMonths, raiseRate,
  );

  const step = totalBudget > 3000 ? 50 : totalBudget > 1500 ? 20 : 10;
  let bestWealth = -Infinity;
  let bestRev = 0, bestExt = 0, bestDebt = 0;

  for (let d = 0; d <= totalBudget; d += step) {
    for (let r = 0; r <= totalBudget - d; r += step) {
      const ex = totalBudget - d - r;
      const w  = simulate(
        revStart, extStart, debtStart,
        r, ex, d,
        rR1, rR2, revTier, eR, dR,
        simMonths, raiseRate,
      );
      if (w > bestWealth) { bestWealth = w; bestRev = r; bestExt = ex; bestDebt = d; }
    }
  }

  const result: OptimizeResult = { bestRev, bestExt, bestDebt, bestWealth, currentWealth };
  (self as DedicatedWorkerGlobalScope).postMessage(result);
};
