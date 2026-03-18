import { useId, useMemo, useRef, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ArcElement);

import { useTranslation } from 'react-i18next';
import type { PlannerInputs, Expense, OptimizeResult } from '../../types';
import { runSimulation, getDebtFreeResult, monthlyRate, duoMonthlyPayment, DUO_THRESHOLD } from '../../utils/simulation';
import { estimateNetMonthly } from '../../utils/tax';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ModuleLayout      from '../../components/ModuleLayout/ModuleLayout';
import CashFlowSection   from '../../components/CashFlowSection/CashFlowSection';
import AllocationSection from '../../components/AllocationSection/AllocationSection';
import InputGrid         from '../../components/InputGrid/InputGrid';
import StatGrid          from '../../components/StatGrid/StatGrid';
import StrategyChart     from '../../components/StrategyChart/StrategyChart';
import OptimizeSection   from '../../components/OptimizeSection/OptimizeSection';
import TimelineEditor    from '../../components/TimelineEditor/TimelineEditor';
import styles from './WealthPlanner.module.css';

// Numeric defaults only — labels are derived from translations inside the component
const DEFAULT_EXPENSE_SEEDS = [
  { id: 'e1', category: 'housing'       as const, amount: 900 },
  { id: 'e2', category: 'food'          as const, amount: 350 },
  { id: 'e3', category: 'insurance'     as const, amount: 135 },
  { id: 'e4', category: 'transport'     as const, amount: 150 },
  { id: 'e5', category: 'utilities'     as const, amount: 110 },
  { id: 'e6', category: 'subscriptions' as const, amount: 55  },
  { id: 'e7', category: 'leisure'       as const, amount: 150 },
];

const DEFAULT_INPUTS_BASE = {
  years:        5,
  grossIncome:  52_000,  // annual gross (≈ median Netherlands 2025)
  netIncome:    3_200,   // net monthly take-home (user can override)
  raiseRate:    2,
  revInit:      5000,
  revMo:        0,
  revRate1:     1.5,
  revTier:      50000,
  revRate2:     0.5,
  extInit:      3000,
  extMo:        0,
  extRate:      3.5,
  debtInit:     28_000,
  debtMo:       250,
  extraDebtMo:  0,
  debtRate:     2.56,
  debtPlan:     'manual' as const,
  stockInit:    0,
  stockMo:      0,
  stockRate:    7.0,
  bufferAmount:   5000,
  bufferOverflow: 'ext' as const,
  events:         [] as PlannerInputs['events'],
};

export default function WealthPlanner() {
  const { t }    = useTranslation();
  const yearId   = useId();

  // Build localised default expenses once per language change
  const defaultExpenses = useMemo(() =>
    DEFAULT_EXPENSE_SEEDS.map(s => ({
      ...s,
      label: t(`wealthPlanner.cashFlow.categories.${s.category}`),
    })),
    [t],
  );

  const defaultInputs: PlannerInputs = useMemo(() => ({
    ...DEFAULT_INPUTS_BASE,
    expenses: defaultExpenses,
  }), [defaultExpenses]);

  const [inputs, setInputs] = useLocalStorage<PlannerInputs>('module:vermogenplanner', defaultInputs);
  const animRef  = useRef<number | null>(null);

  // Merge with defaults — handles old saved state missing new fields
  const safeInputs = useMemo((): PlannerInputs => {
    const merged: PlannerInputs = { ...defaultInputs, ...inputs, events: inputs.events ?? [] };
    // Migrate old freeIncome field
    if (!merged.netIncome && (inputs as unknown as { freeIncome?: number }).freeIncome) {
      merged.netIncome = (inputs as unknown as { freeIncome: number }).freeIncome;
    }
    // Back-fill grossIncome from old debtGrossIncome if present
    if (!merged.grossIncome) {
      const legacy = inputs as unknown as { debtGrossIncome?: number };
      merged.grossIncome = legacy.debtGrossIncome ?? defaultInputs.grossIncome;
    }
    if (!merged.expenses || merged.expenses.length === 0) {
      merged.expenses = defaultExpenses;
    }
    return merged;
  }, [inputs, defaultInputs, defaultExpenses]);

  function update<K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  // Derived
  const totalExpenses = useMemo(
    () => safeInputs.expenses.reduce((s, e) => s + e.amount, 0),
    [safeInputs.expenses],
  );

  // Dutch tax estimate for the net-income hint in the UI
  const estimatedNet = useMemo(
    () => estimateNetMonthly(safeInputs.grossIncome),
    [safeInputs.grossIncome],
  );

  // For SF15/SF35 plans, override debtMo with the DUO-calculated amount (year 1)
  const effectiveDebtMo = useMemo(() => {
    if (safeInputs.debtPlan !== 'manual') {
      return Math.round(duoMonthlyPayment(safeInputs.grossIncome));
    }
    return safeInputs.debtMo;
  }, [safeInputs.debtPlan, safeInputs.grossIncome, safeInputs.debtMo]);

  const effectiveInputs = useMemo(
    () => ({ ...safeInputs, debtMo: effectiveDebtMo + (safeInputs.extraDebtMo ?? 0) }),
    [safeInputs, effectiveDebtMo],
  );

  const freeBudget = safeInputs.netIncome - totalExpenses - effectiveDebtMo;

  // Monthly amount to earmark for upcoming savings goals
  const savingsGoalMonthly = useMemo(() =>
    safeInputs.events
      .filter(e => e.type === 'savings_goal' && e.year > 0)
      .reduce((sum, e) => sum + e.amount / (e.year * 12), 0),
    [safeInputs.events],
  );

  const simResult      = useMemo(() => runSimulation(effectiveInputs), [effectiveInputs]);
  const debtFreeResult = useMemo(() => getDebtFreeResult(simResult, effectiveInputs), [simResult, effectiveInputs]);
  const debtFreeText   = t(debtFreeResult.key, debtFreeResult as Record<string, unknown>);
  const totalMonths    = safeInputs.years * 12;

  const endIncome = useMemo(() => {
    const factor = Math.pow(1 + safeInputs.raiseRate / 100, safeInputs.years);
    return Math.round(safeInputs.netIncome * factor);
  }, [safeInputs.netIncome, safeInputs.raiseRate, safeInputs.years]);

  const handleApplyBest = useCallback((best: OptimizeResult) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const s0 = { rev: safeInputs.revMo, ext: safeInputs.extMo, stock: safeInputs.stockMo, extraDebt: safeInputs.extraDebtMo ?? 0 };
    const t0  = performance.now();
    const dur = 600;
    function step(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setInputs(prev => ({
        ...prev,
        revMo:       Math.round(s0.rev       + (best.bestRev       - s0.rev)       * e),
        extMo:       Math.round(s0.ext       + (best.bestExt       - s0.ext)       * e),
        stockMo:     Math.round(s0.stock     + (best.bestStock     - s0.stock)     * e),
        extraDebtMo: Math.round(s0.extraDebt + (best.bestExtraDebt - s0.extraDebt) * e),
      }));
      if (p < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [safeInputs.revMo, safeInputs.extMo, safeInputs.stockMo, safeInputs.extraDebtMo]);

  const optimizePayload = useMemo(() => ({
    revStart:    safeInputs.revInit,
    extStart:    safeInputs.extInit,
    debtStart:   safeInputs.debtInit,
    stockStart:  safeInputs.stockInit,
    rR1:         monthlyRate(safeInputs.revRate1),
    rR2:         monthlyRate(safeInputs.revRate2),
    revTier:     safeInputs.revTier,
    eR:          monthlyRate(safeInputs.extRate),
    dR:          safeInputs.debtPlan !== 'manual'
                   ? safeInputs.debtRate / 100 / 12
                   : monthlyRate(safeInputs.debtRate),
    // Note: optimizer uses fixed debtMo per month; dynamic DUO growth handled in main sim only
    sR:          monthlyRate(safeInputs.stockRate),
    totalBudget: Math.max(freeBudget, 0),
    simMonths:   safeInputs.years * 12,
    raiseRate:   safeInputs.raiseRate,
    curRevMo:    safeInputs.revMo,
    curExtMo:    safeInputs.extMo,
    curDebtMo:   effectiveDebtMo + (safeInputs.extraDebtMo ?? 0),
    curStockMo:   safeInputs.stockMo,
    bufferAmount: safeInputs.bufferAmount,
  }), [safeInputs, freeBudget, effectiveDebtMo]);

  return (
    <ModuleLayout>
      {/* ── Page header ── */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>💸</div>
        <div className={styles.headerText}>
          <h1>{t('wealthPlanner.title')}</h1>
          <p>{t('wealthPlanner.subtitle', { years: safeInputs.years })}</p>
        </div>
        <div className={styles.yearWrap}>
          <label htmlFor={yearId} className={styles.yearLabel}>{t('wealthPlanner.yearSelect')}</label>
          <select
            id={yearId}
            value={safeInputs.years}
            onChange={e => update('years', parseInt(e.target.value))}
          >
            {[1, 2, 3, 5, 7, 10, 15, 20, 30, 50].map(y => (
              <option key={y} value={y}>{t('wealthPlanner.yearOption', { n: y })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 1. Cash Flow ── */}
      <section className={`${styles.section} ${styles.income}`}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionHeadIcon}>💰</span>
          <div className={styles.sectionHeadText}>
            <h2>{t('wealthPlanner.cashFlow.title')}</h2>
            <p>{t('wealthPlanner.cashFlow.netIncome')} → {t('wealthPlanner.cashFlow.expenses')} → {t('wealthPlanner.cashFlow.freeBudget')}</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <CashFlowSection
            grossIncome={safeInputs.grossIncome}
            estimatedNet={estimatedNet}
            netIncome={safeInputs.netIncome}
            raiseRate={safeInputs.raiseRate}
            expenses={safeInputs.expenses}
            allocated={safeInputs.revMo + safeInputs.extMo + safeInputs.stockMo}
            effectiveDebtMo={effectiveDebtMo}
            debtPlanFixed={safeInputs.debtPlan !== 'manual'}
            onGrossIncomeChange={v => update('grossIncome', v)}
            onNetIncomeChange={v => update('netIncome', v)}
            onRaiseRateChange={v => update('raiseRate', v)}
            onExpensesChange={v => update('expenses', v as Expense[])}
            onDebtMoChange={v => update('debtMo', v)}
          />
        </div>
      </section>

      {/* ── 2. Monthly Allocation ── */}
      <section className={`${styles.section} ${styles.alloc}`}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionHeadIcon}>🎯</span>
          <div className={styles.sectionHeadText}>
            <h2>{t('wealthPlanner.allocation.title')}</h2>
            <p>{t('wealthPlanner.allocation.subtitle')}</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <AllocationSection
            freeBudget={freeBudget}
            revMo={safeInputs.revMo}
            extMo={safeInputs.extMo}
            stockMo={safeInputs.stockMo}
            hasDebt={safeInputs.debtInit > 0}
            extraDebtMo={safeInputs.extraDebtMo ?? 0}
            bufferAmount={safeInputs.bufferAmount}
            bufferOverflow={safeInputs.bufferOverflow}
            savingsGoalMonthly={savingsGoalMonthly}
            onRevMoChange={v           => update('revMo',          v)}
            onExtMoChange={v           => update('extMo',          v)}
            onStockMoChange={v         => update('stockMo',        v)}
            onExtraDebtMoChange={v     => update('extraDebtMo',    v)}
            onBufferAmountChange={v    => update('bufferAmount',   v)}
            onBufferOverflowChange={v  => update('bufferOverflow', v)}
          />
        </div>
      </section>

      {/* ── 3. Optimiser ── */}
      <div className={styles.optimizeWrap}>
        <OptimizeSection
          payload={optimizePayload}
          currentRevMo={safeInputs.revMo}
          currentExtMo={safeInputs.extMo}
          currentStockMo={safeInputs.stockMo}
          currentExtraDebtMo={safeInputs.extraDebtMo ?? 0}
          hasDebt={safeInputs.debtInit > 0}
          years={safeInputs.years}
          onApplyBest={handleApplyBest}
        />
      </div>

      {/* ── 4. Account Settings ── */}
      <section className={`${styles.section} ${styles.accounts}`}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionHeadIcon}>🏦</span>
          <div className={styles.sectionHeadText}>
            <h2>{t('wealthPlanner.accounts.title')}</h2>
            <p>{t('wealthPlanner.accounts.subtitle')}</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <InputGrid inputs={safeInputs} onChange={update} />
        </div>
      </section>

      {/* ── 5. One-time Events ── */}
      <section className={`${styles.section} ${styles.timeline}`}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionHeadIcon}>📅</span>
          <div className={styles.sectionHeadText}>
            <h2>{t('wealthPlanner.timeline.title')}</h2>
            <p>{t('wealthPlanner.timeline.empty')}</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <TimelineEditor
            events={safeInputs.events}
            maxYear={safeInputs.years}
            onChange={evts => update('events', evts)}
          />
        </div>
      </section>

      {/* ── 6. Projection ── */}
      <section className={`${styles.section} ${styles.results}`}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionHeadIcon}>📈</span>
          <div className={styles.sectionHeadText}>
            <h2>{t('wealthPlanner.stats.wealth', { years: safeInputs.years })}</h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <StatGrid
            wealth={simResult.wealthHist[totalMonths]}
            debtFreeText={debtFreeText}
            assets={simResult.assetHist[totalMonths]}
            stocks={simResult.stockHist[totalMonths]}
            endIncome={endIncome}
            years={safeInputs.years}
          />
          <StrategyChart
            simResult={simResult}
            years={safeInputs.years}
            bufferAmount={safeInputs.bufferAmount}
          />
        </div>
      </section>

      <footer className={styles.footer}>{t('wealthPlanner.footer')}</footer>
    </ModuleLayout>
  );
}
