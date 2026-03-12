import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { OptimizePayload, OptimizeResult } from '../../types';
import { launchConfetti } from '../../utils/confetti';
import OptimizerWorker from '../../workers/optimizer.worker?worker';
import styles from './OptimizeSection.module.css';

interface Props {
  payload:       OptimizePayload;
  currentRevMo:  number;
  currentExtMo:  number;
  currentDebtMo: number;
  years:         number;
  onApplyBest:   (result: OptimizeResult) => void;
}

type State = 'idle' | 'computing' | 'done';

export default function OptimizeSection({
  payload, currentRevMo, currentExtMo, currentDebtMo, years, onApplyBest,
}: Props) {
  const { t } = useTranslation();
  const [state,  setState]  = useState<State>('idle');
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const workerRef   = useRef<Worker | null>(null);

  function handleOptimize() {
    if (workerRef.current) workerRef.current.terminate();
    setState('computing');
    setResult(null);

    const worker = new OptimizerWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<OptimizeResult>) => {
      setResult(e.data);
      setState('done');
      if (confettiRef.current) launchConfetti(confettiRef.current);
      setTimeout(() => setState('idle'), 3500);
    };
    worker.postMessage(payload);
  }

  const diff        = result ? result.bestWealth - result.currentWealth : 0;
  const isComputing = state === 'computing';
  const isDone      = state === 'done';

  const btnLabel = isComputing
    ? t('wealthPlanner.optimize.computing')
    : isDone
      ? t('wealthPlanner.optimize.found')
      : t('wealthPlanner.optimize.button');

  const perMonth = t('wealthPlanner.optimize.perMonth');

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${isComputing ? styles.computing : ''} ${isDone ? styles.scored : ''}`}
        onClick={handleOptimize}
        disabled={isComputing}
      >
        <span className={styles.bg} />
        <span className={`${styles.shine} ${isDone ? styles.flash : ''}`} />
        <span className={styles.content}>
          <span className={`${styles.icon} ${isComputing ? styles.spin : ''} ${isDone ? styles.celly : ''}`}>
            🏑
          </span>
          <span>{btnLabel}</span>
        </span>
        <canvas ref={confettiRef} className={styles.confetti} />
      </button>

      {result && (
        <div className={styles.result}>
          <div className={styles.resultTitle}>
            {t('wealthPlanner.optimize.resultTitle', { budget: payload.totalBudget })}
          </div>
          <div className={styles.resultGrid}>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.bank')}: <strong>€{result.bestRev}</strong>{perMonth}</div>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.current')}: €{currentRevMo}{perMonth}</div>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.deposit')}: <strong>€{result.bestExt}</strong>{perMonth}</div>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.current')}: €{currentExtMo}{perMonth}</div>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.duo')}: <strong>€{result.bestDebt}</strong>{perMonth}</div>
            <div className={styles.resultItem}>{t('wealthPlanner.optimize.current')}: €{currentDebtMo}{perMonth}</div>
          </div>
          <div className={styles.resultDiff}>
            {diff > 0
              ? t('wealthPlanner.optimize.gainText', { amount: diff.toLocaleString(), years })
              : diff === 0
                ? t('wealthPlanner.optimize.optimal')
                : `€${Math.abs(diff).toLocaleString()}`
            }
          </div>
          {diff !== 0 && (
            <button className={styles.applyBtn} onClick={() => onApplyBest(result!)}>
              {t('wealthPlanner.optimize.apply')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
