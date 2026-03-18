import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { OptimizePayload, OptimizeResult } from '../../types';
import { launchConfetti } from '../../utils/confetti';
import OptimizerWorker from '../../workers/optimizer.worker?worker';
import styles from './OptimizeSection.module.css';

interface Props {
  payload:        OptimizePayload;
  currentRevMo:   number;
  currentExtMo:   number;
  currentDebtMo:  number;
  currentStockMo: number;
  years:          number;
  onApplyBest:    (result: OptimizeResult) => void;
}

type State = 'idle' | 'computing' | 'done';

export default function OptimizeSection({
  payload, currentRevMo, currentExtMo, currentDebtMo, currentStockMo, years, onApplyBest,
}: Props) {
  const { t } = useTranslation();
  const [state,   setState]   = useState<State>('idle');
  const [result,  setResult]  = useState<OptimizeResult | null>(null);
  const [applied, setApplied] = useState(false);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const workerRef   = useRef<Worker | null>(null);

  function handleOptimize() {
    if (workerRef.current) workerRef.current.terminate();
    setState('computing');
    setResult(null);
    setApplied(false);

    const worker = new OptimizerWorker();
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<OptimizeResult>) => {
      setResult(e.data);
      setState('done');
      if (confettiRef.current) launchConfetti(confettiRef.current);
    };
    worker.postMessage(payload);
  }

  function handleApply() {
    if (!result) return;
    setApplied(true);
    onApplyBest(result);
    setTimeout(() => {
      setResult(null);
      setState('idle');
      setApplied(false);
    }, 1800);
  }

  const diff        = result ? result.bestWealth - result.currentWealth : 0;
  const isComputing = state === 'computing';
  const isDone      = state === 'done';

  const btnLabel = isComputing
    ? t('wealthPlanner.optimize.computing')
    : isDone
      ? t('wealthPlanner.optimize.found')
      : t('wealthPlanner.optimize.button');

  // Build comparison rows
  const rows = result ? [
    { key: 'bank',    label: t('wealthPlanner.optimize.bank'),    cur: currentRevMo,   opt: result.bestRev   },
    { key: 'deposit', label: t('wealthPlanner.optimize.deposit'), cur: currentExtMo,   opt: result.bestExt   },
    { key: 'stocks',  label: t('wealthPlanner.optimize.stocks'),  cur: currentStockMo, opt: result.bestStock  },
    { key: 'duo',     label: t('wealthPlanner.optimize.duo'),     cur: currentDebtMo,  opt: result.bestDebt  },
  ] : [];

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
        <div className={`${styles.result} ${applied ? styles.resultApplied : ''}`}>
          <div className={styles.resultTitle}>
            {t('wealthPlanner.optimize.resultTitle', { budget: payload.totalBudget.toLocaleString() })}
          </div>

          <div className={styles.compareList}>
            {rows.map(row => {
              const delta = row.opt - row.cur;
              return (
                <div key={row.key} className={styles.compareRow}>
                  <span className={styles.compareLabel}>{row.label}</span>
                  <div className={styles.compareValues}>
                    <span className={styles.curVal}>€{row.cur}</span>
                    <span className={`${styles.arrow} ${delta > 0 ? styles.arrowUp : delta < 0 ? styles.arrowDown : styles.arrowFlat}`}>
                      {delta > 0 ? '↑' : delta < 0 ? '↓' : '–'}
                    </span>
                    <span className={`${styles.optVal} ${delta > 0 ? styles.optUp : delta < 0 ? styles.optDown : ''}`}>
                      €{row.opt}
                    </span>
                    {delta !== 0 && (
                      <span className={`${styles.delta} ${delta > 0 ? styles.deltaPos : styles.deltaNeg}`}>
                        {delta > 0 ? '+' : ''}€{delta}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.resultDiff}>
            {diff > 0
              ? t('wealthPlanner.optimize.gainText', { amount: diff.toLocaleString(), years })
              : t('wealthPlanner.optimize.optimal')
            }
          </div>

          {diff !== 0 && (
            <button
              className={`${styles.applyBtn} ${applied ? styles.applyDone : ''}`}
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? '✓ ' + t('wealthPlanner.optimize.applied') : t('wealthPlanner.optimize.apply')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
