import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import styles from './AllocationSection.module.css';

interface Props {
  freeBudget:              number;
  revMo:                   number;
  extMo:                   number;
  stockMo:                 number;
  hasDebt:                 boolean;
  extraDebtMo:             number;
  bufferAmount:            number;
  bufferOverflow:          'ext' | 'stock';
  savingsGoalMonthly?:     number;
  onRevMoChange:           (v: number) => void;
  onExtMoChange:           (v: number) => void;
  onStockMoChange:         (v: number) => void;
  onExtraDebtMoChange:     (v: number) => void;
  onBufferAmountChange:    (v: number) => void;
  onBufferOverflowChange:  (v: 'ext' | 'stock') => void;
}

interface AllocItem { key: string; label: string; value: number; color: string; onChange: (v: number) => void; }

export default function AllocationSection({
  freeBudget, revMo, extMo, stockMo, hasDebt, extraDebtMo, bufferAmount, bufferOverflow,
  savingsGoalMonthly = 0,
  onRevMoChange, onExtMoChange, onStockMoChange, onExtraDebtMoChange,
  onBufferAmountChange, onBufferOverflowChange,
}: Props) {
  const { t } = useTranslation();

  const allocated  = revMo + extMo + stockMo + (hasDebt ? extraDebtMo : 0);
  const remaining  = freeBudget - allocated;
  const overBudget = remaining < 0;

  const allocs: AllocItem[] = [
    { key: 'bank',    label: t('wealthPlanner.allocation.bank'),    value: revMo,      color: 'rgba(96,165,250,0.85)',  onChange: onRevMoChange },
    { key: 'deposit', label: t('wealthPlanner.allocation.deposit'), value: extMo,      color: 'rgba(74,222,128,0.85)',  onChange: onExtMoChange },
    { key: 'stocks',  label: t('wealthPlanner.allocation.stocks'),  value: stockMo,    color: 'rgba(167,139,250,0.85)', onChange: onStockMoChange },
    ...(hasDebt ? [{ key: 'extraDebt', label: t('wealthPlanner.allocation.extraDebt'), value: extraDebtMo, color: 'rgba(248,113,113,0.85)', onChange: onExtraDebtMoChange }] : []),
  ];

  const chartItems = [...allocs];
  if (remaining > 0) chartItems.push({
    key: 'unalloc', label: t('wealthPlanner.allocation.unallocated'), value: remaining,
    color: 'rgba(251,191,36,0.4)', onChange: () => {},
  });

  const activeChart = chartItems.filter(i => i.value > 0);

  const data: ChartData<'doughnut'> = {
    labels: activeChart.map(i => i.label),
    datasets: [{
      data:            activeChart.map(i => i.value),
      backgroundColor: activeChart.map(i => i.color),
      borderColor:     activeChart.map(i => i.color.replace(/[\d.]+\)$/, '1)')),
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '64%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        titleFont: { family: 'DM Sans' },
        bodyFont:  { family: 'DM Sans' },
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: ctx => {
            const vals = ctx.dataset.data as number[];
            const tot  = vals.reduce((a, b) => a + b, 0);
            const pct  = tot > 0 ? Math.round((ctx.parsed as number) / tot * 100) : 0;
            return ` €${(ctx.parsed as number).toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={styles.wrap}>
      {/* Left: doughnut with center label */}
      <div className={styles.chartCol}>
        <div className={styles.chartWrap}>
          <Doughnut data={data} options={options} />
          <div className={styles.chartCenter}>
            <span className={styles.centerVal}>€{allocated.toLocaleString()}</span>
            <span className={styles.centerLabel}>{t('wealthPlanner.allocation.allocated')}</span>
          </div>
        </div>
      </div>

      {/* Right: allocation inputs + utilisation bar */}
      <div className={styles.inputCol}>
        <BudgetBar allocated={allocated} freeBudget={freeBudget} overBudget={overBudget} />

        <div className={styles.allocList}>
          {allocs.map(item => (
            <AllocRow key={item.key} item={item} />
          ))}
        </div>

        {savingsGoalMonthly > 0 && (
          <div className={styles.goalEarmarkRow}>
            <span className={styles.goalEarmarkIcon}>🏠</span>
            <span className={styles.goalEarmarkLabel}>{t('wealthPlanner.timeline.goalEarmark')}</span>
            <span className={styles.goalEarmarkVal}>€{Math.round(savingsGoalMonthly).toLocaleString()}/mo</span>
          </div>
        )}

        {remaining > 0 && (
          <div className={styles.unallocRow}>
            <div className={styles.dot} style={{ background: 'rgba(251,191,36,0.5)' }} />
            <span className={styles.unallocLabel}>{t('wealthPlanner.allocation.unallocated')}</span>
            <span className={styles.unallocVal}>€{remaining.toLocaleString()}/mo</span>
          </div>
        )}

        <BufferInput
          value={bufferAmount}
          overflow={bufferOverflow}
          onChange={onBufferAmountChange}
          onOverflowChange={onBufferOverflowChange}
        />
      </div>
    </div>
  );
}

function BudgetBar({ allocated, freeBudget, overBudget }: { allocated: number; freeBudget: number; overBudget: boolean }) {
  const { t } = useTranslation();
  const pct = freeBudget > 0 ? Math.min(allocated / freeBudget * 100, 100) : 0;
  return (
    <div className={styles.budgetBar}>
      <div className={styles.budgetLabels}>
        <span className={styles.budgetKey}>{t('wealthPlanner.allocation.allocated')}</span>
        <span className={`${styles.budgetVal} ${overBudget ? styles.over : ''}`}>
          €{allocated.toLocaleString()} / €{freeBudget.toLocaleString()} {t('wealthPlanner.allocation.ofBudget')}
        </span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${overBudget ? styles.fillOver : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AllocRow({ item }: { item: AllocItem }) {
  const { t } = useTranslation();
  const id    = useId();

  return (
    <div className={styles.allocRow}>
      <div className={styles.dot} style={{ background: item.color }} />
      <label htmlFor={id} className={styles.allocLabel}>{item.label}</label>
      <div className={styles.allocInputWrap}>
        <span className={styles.euro}>€</span>
        <input
          id={id}
          type="number"
          value={item.value}
          step={50}
          min={0}
          onChange={e => item.onChange(parseFloat(e.target.value) || 0)}
          className={styles.allocInput}
          aria-label={`${item.label} — ${t('wealthPlanner.allocation.allocated')}`}
        />
        <span className={styles.mo}>/mo</span>
      </div>
    </div>
  );
}

function BufferInput({
  value, overflow, onChange, onOverflowChange,
}: {
  value: number;
  overflow: 'ext' | 'stock';
  onChange: (v: number) => void;
  onOverflowChange: (v: 'ext' | 'stock') => void;
}) {
  const { t }      = useTranslation();
  const id         = useId();
  const overflowId = useId();
  return (
    <div className={styles.bufferRow}>
      <div className={styles.bufferTopRow}>
        <label htmlFor={id} className={styles.bufferLabel}>{t('wealthPlanner.allocation.buffer')}</label>
        <div className={styles.allocInputWrap}>
          <span className={styles.euro}>€</span>
          <input
            id={id}
            type="number"
            value={value}
            step={500}
            min={0}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className={styles.allocInput}
          />
        </div>
      </div>
      <div className={styles.overflowRow}>
        <label htmlFor={overflowId} className={styles.overflowLabel}>
          {t('wealthPlanner.allocation.overflowLabel')}
        </label>
        <select
          id={overflowId}
          className={styles.overflowSelect}
          value={overflow}
          onChange={e => onOverflowChange(e.target.value as 'ext' | 'stock')}
        >
          <option value="ext">{t('wealthPlanner.allocation.deposit')}</option>
          <option value="stock">{t('wealthPlanner.allocation.stocks')}</option>
        </select>
      </div>
      <p className={styles.bufferNote}>{t('wealthPlanner.allocation.bufferNote')}</p>
    </div>
  );
}
