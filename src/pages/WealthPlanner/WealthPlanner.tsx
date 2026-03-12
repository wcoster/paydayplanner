import { useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlannerInputs, OptimizeResult } from '../../types';
import { runSimulation, getDebtFreeResult, monthlyRate } from '../../utils/simulation';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ModuleLayout      from '../../components/ModuleLayout/ModuleLayout';
import IncomeBar         from '../../components/IncomeBar/IncomeBar';
import StatGrid          from '../../components/StatGrid/StatGrid';
import InputGrid         from '../../components/InputGrid/InputGrid';
import AllocationSection from '../../components/AllocationSection/AllocationSection';
import StrategyChart     from '../../components/StrategyChart/StrategyChart';
import OptimizeSection   from '../../components/OptimizeSection/OptimizeSection';
import styles from './WealthPlanner.module.css';

const DEFAULT_INPUTS: PlannerInputs = {
  years:      5,
  freeIncome: 1200,
  raiseRate:  2,
  revInit:    8000,
  revMo:      200,
  revRate1:   2.0,
  revTier:    2000,
  revRate2:   1.0,
  extInit:    5000,
  extMo:      400,
  extRate:    2.0,
  debtInit:   30000,
  debtMo:     300,
  debtRate:   2.57,
};

export default function WealthPlanner() {
  const { t } = useTranslation();
  const [inputs, setInputs] = useLocalStorage<PlannerInputs>('module:vermogenplanner', DEFAULT_INPUTS);
  const animRef = useRef<number | null>(null);

  function update<K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  const simResult      = useMemo(() => runSimulation(inputs), [inputs]);
  const debtFreeResult = useMemo(() => getDebtFreeResult(simResult, inputs), [simResult, inputs]);
  const debtFreeText   = t(debtFreeResult.key, debtFreeResult as Record<string, unknown>);

  const endIncome = useMemo(() => {
    const factor = Math.pow(1 + inputs.raiseRate / 100, inputs.years);
    return Math.round(inputs.freeIncome * factor);
  }, [inputs.freeIncome, inputs.raiseRate, inputs.years]);

  const handleApplyBest = useCallback((best: OptimizeResult) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startRev  = inputs.revMo;
    const startExt  = inputs.extMo;
    const startDebt = inputs.debtMo;
    const t0  = performance.now();
    const dur = 600;

    function step(now: number) {
      const elapsed = Math.min((now - t0) / dur, 1);
      const ease    = 1 - Math.pow(1 - elapsed, 3);
      setInputs(prev => ({
        ...prev,
        revMo:  Math.round(startRev  + (best.bestRev  - startRev)  * ease),
        extMo:  Math.round(startExt  + (best.bestExt  - startExt)  * ease),
        debtMo: Math.round(startDebt + (best.bestDebt - startDebt) * ease),
      }));
      if (elapsed < 1) animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
  }, [inputs.revMo, inputs.extMo, inputs.debtMo]);

  const optimizePayload = useMemo(() => ({
    revStart:    inputs.revInit,
    extStart:    inputs.extInit,
    debtStart:   inputs.debtInit,
    rR1:         monthlyRate(inputs.revRate1),
    rR2:         monthlyRate(inputs.revRate2),
    revTier:     inputs.revTier,
    eR:          monthlyRate(inputs.extRate),
    dR:          monthlyRate(inputs.debtRate),
    totalBudget: inputs.freeIncome,
    simMonths:   inputs.years * 12,
    raiseRate:   inputs.raiseRate,
    curRevMo:    inputs.revMo,
    curExtMo:    inputs.extMo,
    curDebtMo:   inputs.debtMo,
  }), [inputs]);

  const totalMonths = inputs.years * 12;

  return (
    <ModuleLayout>
      <div className={styles.header}>
        <div className={styles.headerIcon}>🏑</div>
        <div className={styles.headerText}>
          <h1>{t('wealthPlanner.title')}</h1>
          <p>{t('wealthPlanner.subtitle', { years: inputs.years })}</p>
        </div>
        <div className={styles.yearWrap}>
          <select value={inputs.years} onChange={e => update('years', parseInt(e.target.value))}>
            {[1, 2, 3, 5, 7, 10, 15, 20, 30].map(y => (
              <option key={y} value={y}>{t('wealthPlanner.yearOption', { n: y })}</option>
            ))}
          </select>
        </div>
      </div>

      <IncomeBar
        freeIncome={inputs.freeIncome}
        raiseRate={inputs.raiseRate}
        revMo={inputs.revMo}
        extMo={inputs.extMo}
        debtMo={inputs.debtMo}
        onFreeIncomeChange={v => update('freeIncome', v)}
        onRaiseRateChange={v  => update('raiseRate',  v)}
      />

      <StatGrid
        wealth={simResult.wealthHist[totalMonths]}
        debtFreeText={debtFreeText}
        assets={simResult.assetHist[totalMonths]}
        endIncome={endIncome}
        years={inputs.years}
      />

      <AllocationSection
        freeIncome={inputs.freeIncome}
        revMo={inputs.revMo}
        extMo={inputs.extMo}
        debtMo={inputs.debtMo}
      />

      <InputGrid inputs={inputs} onChange={update} />

      <OptimizeSection
        payload={optimizePayload}
        currentRevMo={inputs.revMo}
        currentExtMo={inputs.extMo}
        currentDebtMo={inputs.debtMo}
        years={inputs.years}
        onApplyBest={handleApplyBest}
      />

      <StrategyChart simResult={simResult} years={inputs.years} />

      <footer className={styles.footer}>{t('wealthPlanner.footer')}</footer>
    </ModuleLayout>
  );
}
