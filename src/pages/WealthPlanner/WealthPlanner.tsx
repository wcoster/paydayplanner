import { useId, useMemo, useRef, useCallback } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ArcElement);

import { useTranslation } from 'react-i18next';
import type { PlannerInputs, Expense, OptimizeResult } from '../../types';
import { runSimulation, getDebtFreeResult, monthlyRate } from '../../utils/simulation';
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

const DEFAULT_EXPENSES = [
  { id: 'e1', label: 'Rent / Mortgage',   category: 'housing'       as const, amount: 900 },
  { id: 'e2', label: 'Groceries',          category: 'food'          as const, amount: 350 },
  { id: 'e3', label: 'Health insurance',   category: 'insurance'     as const, amount: 135 },
  { id: 'e4', label: 'Transport',          category: 'transport'     as const, amount: 150 },
  { id: 'e5', label: 'Utilities',          category: 'utilities'     as const, amount: 110 },
  { id: 'e6', label: 'Subscriptions',      category: 'subscriptions' as const, amount: 55  },
  { id: 'e7', label: 'Leisure',            category: 'leisure'       as const, amount: 150 },
];

const DEFAULT_INPUTS: PlannerInputs = {
  years:        5,
  netIncome:    3200,
  raiseRate:    2,
  expenses:     DEFAULT_EXPENSES,
  revInit:      5000,
  revMo:        300,
  revRate1:     1.5,
  revTier:      50000,
  revRate2:     0.5,
  extInit:      3000,
  extMo:        150,
  extRate:      3.5,
  debtInit:     28000,
  debtMo:       250,
  debtRate:     2.57,
  stockInit:    0,
  stockMo:      100,
  stockRate:    7.0,
  bufferAmount: 5000,
  events:       [],
};

export default function WealthPlanner() {
  const { t }    = useTranslation();
  const yearId   = useId();
  const [inputs, setInputs] = useLocalStorage<PlannerInputs>('module:vermogenplanner', DEFAULT_INPUTS);
  const animRef  = useRef<number | null>(null);

  // Merge with defaults — handles old saved state missing new fields (freeIncome → netIncome, expenses)
  const safeInputs = useMemo((): PlannerInputs => {
    const merged: PlannerInputs = { ...DEFAULT_INPUTS, ...inputs, events: inputs.events ?? [] };
    // Migrate old freeIncome field
    if (!merged.netIncome && (inputs as unknown as { freeIncome?: number }).freeIncome) {
      merged.netIncome = (inputs as unknown as { freeIncome: number }).freeIncome;
    }
    if (!merged.expenses || merged.expenses.length === 0) {
      merged.expenses = DEFAULT_EXPENSES;
    }
    return merged;
  }, [inputs]);

  function update<K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  // Derived
  const totalExpenses = useMemo(
    () => safeInputs.expenses.reduce((s, e) => s + e.amount, 0),
    [safeInputs.expenses],
  );
  const freeBudget = safeInputs.netIncome - totalExpenses;

  const simResult      = useMemo(() => runSimulation(safeInputs), [safeInputs]);
  const debtFreeResult = useMemo(() => getDebtFreeResult(simResult, safeInputs), [simResult, safeInputs]);
  const debtFreeText   = t(debtFreeResult.key, debtFreeResult as Record<string, unknown>);
  const totalMonths    = safeInputs.years * 12;

  const endIncome = useMemo(() => {
    const factor = Math.pow(1 + safeInputs.raiseRate / 100, safeInputs.years);
    return Math.round(safeInputs.netIncome * factor);
  }, [safeInputs.netIncome, safeInputs.raiseRate, safeInputs.years]);

  const handleApplyBest = useCallback((best: OptimizeResult) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const s0 = { rev: safeInputs.revMo, ext: safeInputs.extMo, debt: safeInputs.debtMo, stock: safeInputs.stockMo };
    const t0  = performance.now();
    const dur = 600;
    function step(now: number) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setInputs(prev => ({
        ...prev,
        revMo:   Math.round(s0.rev   + (best.bestRev   - s0.rev)   * e),
        extMo:   Math.round(s0.ext   + (best.bestExt   - s0.ext)   * e),
        debtMo:  Math.round(s0.debt  + (best.bestDebt  - s0.debt)  * e),
        stockMo: Math.round(s0.stock + (best.bestStock - s0.stock) * e),
      }));
      if (p < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [safeInputs.revMo, safeInputs.extMo, safeInputs.debtMo, safeInputs.stockMo]);

  const optimizePayload = useMemo(() => ({
    revStart:    safeInputs.revInit,
    extStart:    safeInputs.extInit,
    debtStart:   safeInputs.debtInit,
    stockStart:  safeInputs.stockInit,
    rR1:         monthlyRate(safeInputs.revRate1),
    rR2:         monthlyRate(safeInputs.revRate2),
    revTier:     safeInputs.revTier,
    eR:          monthlyRate(safeInputs.extRate),
    dR:          monthlyRate(safeInputs.debtRate),
    sR:          monthlyRate(safeInputs.stockRate),
    totalBudget: Math.max(freeBudget, 0),
    simMonths:   safeInputs.years * 12,
    raiseRate:   safeInputs.raiseRate,
    curRevMo:    safeInputs.revMo,
    curExtMo:    safeInputs.extMo,
    curDebtMo:   safeInputs.debtMo,
    curStockMo:  safeInputs.stockMo,
  }), [safeInputs, freeBudget]);

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
            {[1, 2, 3, 5, 7, 10, 15, 20, 30].map(y => (
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
            netIncome={safeInputs.netIncome}
            raiseRate={safeInputs.raiseRate}
            expenses={safeInputs.expenses}
            allocated={safeInputs.revMo + safeInputs.extMo + safeInputs.debtMo + safeInputs.stockMo}
            onNetIncomeChange={v => update('netIncome', v)}
            onRaiseRateChange={v => update('raiseRate', v)}
            onExpensesChange={v => update('expenses', v as Expense[])}
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
            debtMo={safeInputs.debtMo}
            stockMo={safeInputs.stockMo}
            bufferAmount={safeInputs.bufferAmount}
            hasDebt={safeInputs.debtInit > 0}
            onRevMoChange={v        => update('revMo',        v)}
            onExtMoChange={v        => update('extMo',        v)}
            onDebtMoChange={v       => update('debtMo',       v)}
            onStockMoChange={v      => update('stockMo',      v)}
            onBufferAmountChange={v => update('bufferAmount', v)}
          />
        </div>
      </section>

      {/* ── 3. Optimiser ── */}
      <div className={styles.optimizeWrap}>
        <OptimizeSection
          payload={optimizePayload}
          currentRevMo={safeInputs.revMo}
          currentExtMo={safeInputs.extMo}
          currentDebtMo={safeInputs.debtMo}
          currentStockMo={safeInputs.stockMo}
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
