import { useTranslation } from 'react-i18next';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import styles from './AllocationSection.module.css';

interface Props {
  freeIncome: number;
  revMo:      number;
  extMo:      number;
  debtMo:     number;
}

interface LegendItem { label: string; value: number; color: string; }

export default function AllocationSection({ freeIncome, revMo, extMo, debtMo }: Props) {
  const { t } = useTranslation();

  const allocated = revMo + extMo + debtMo;
  const remaining = freeIncome - allocated;
  const total     = freeIncome > 0 ? freeIncome : allocated;

  const items: LegendItem[] = [
    { label: t('wealthPlanner.allocation.bank'),    value: revMo,  color: 'rgba(96,165,250,0.8)' },
    { label: t('wealthPlanner.allocation.deposit'), value: extMo,  color: 'rgba(74,222,128,0.8)' },
    { label: t('wealthPlanner.allocation.duo'),     value: debtMo, color: 'rgba(248,113,113,0.8)' },
  ];
  if (remaining > 0) items.push({ label: t('wealthPlanner.allocation.unallocated'), value: remaining, color: 'rgba(251,191,36,0.5)' });

  const activeItems = items.filter(i => i.value > 0);

  const data: ChartData<'doughnut'> = {
    labels: activeItems.map(i => i.label),
    datasets: [{
      data:            activeItems.map(i => i.value),
      backgroundColor: activeItems.map(i => i.color),
      borderColor:     activeItems.map(i => i.color.replace('0.8', '1').replace('0.5', '1')),
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--tooltip-bg)',
        titleFont: { family: 'DM Sans' },
        bodyFont:  { family: 'DM Sans' },
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: ctx => {
            const vals  = ctx.dataset.data as number[];
            const tot   = vals.reduce((a, b) => a + b, 0);
            const pct   = tot > 0 ? Math.round((ctx.parsed as number) / tot * 100) : 0;
            return `${ctx.label}: €${(ctx.parsed as number).toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={styles.section}>
      <div className={styles.chartWrap}>
        <Doughnut data={data} options={options} />
      </div>
      <div className={styles.legend}>
        {items.map(item => {
          const pct = total > 0 ? Math.round(item.value / total * 100) : 0;
          return (
            <div key={item.label} className={styles.legendItem}>
              <div className={styles.dot} style={{ background: item.color }} />
              <span className={styles.legendLabel}>{item.label}</span>
              <span className={styles.legendValue}>€{item.value.toLocaleString()}</span>
              <span className={styles.legendPct}>{pct}%</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: item.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
