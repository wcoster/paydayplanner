import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import type { SimResult } from '../../types';
import styles from './StrategyChart.module.css';

interface Props {
  simResult:    SimResult;
  years:        number;
  bufferAmount: number;
}

export default function StrategyChart({ simResult, years, bufferAmount }: Props) {
  const { t } = useTranslation();

  // Defer Chart.js initialisation to the next animation frame so it doesn't
  // trigger a forced synchronous reflow during React's first-paint commit.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const { wealthHist, assetHist, debtHist, stockHist, depositoHist } = simResult;

  const labels = wealthHist.map((_, i) =>
    i % 12 === 0 ? t('wealthPlanner.yearOption', { n: i / 12 }) : ''
  );

  const bufferLine = bufferAmount > 0 ? wealthHist.map(() => bufferAmount) : null;

  const datasets: ChartData<'line'>['datasets'] = [
    {
      label: t('wealthPlanner.chart.netWealth'),
      data: wealthHist,
      borderColor: '#4ade80',
      backgroundColor: 'rgba(74,222,128,0.08)',
      fill: true,
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHitRadius: 8,
    },
    {
      label: t('wealthPlanner.chart.savings'),
      data: assetHist,
      borderColor: '#60a5fa',
      borderDash: [4, 4],
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
    },
    {
      label: t('wealthPlanner.chart.stocks'),
      data: stockHist,
      borderColor: '#a78bfa',
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
    },
    {
      label: t('wealthPlanner.chart.depositos'),
      data: depositoHist,
      borderColor: '#fb923c',
      borderDash: [2, 4],
      tension: 0.35,
      borderWidth: 1.5,
      pointRadius: 0,
      pointHitRadius: 8,
    },
    {
      label: t('wealthPlanner.chart.debt'),
      data: debtHist,
      borderColor: '#f87171',
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
    },
  ];

  if (bufferLine) {
    datasets.push({
      label: t('wealthPlanner.chart.buffer'),
      data: bufferLine,
      borderColor: 'rgba(251,191,36,0.6)',
      borderDash: [6, 3],
      borderWidth: 1.5,
      pointRadius: 0,
      pointHitRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  const data: ChartData<'line'> = { labels, datasets };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255,255,255,0.7)',
          font: { family: 'DM Sans', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { family: 'DM Sans' },
        bodyFont:  { family: 'DM Sans' },
        cornerRadius: 10,
        padding: 12,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: €${(ctx.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: 'rgba(255,255,255,0.35)',
          font: { family: 'DM Sans', size: 11 },
          callback: v => `€${((v as number) / 1000).toFixed(0)}k`,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(255,255,255,0.35)',
          font: { family: 'DM Sans', size: 11 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: Math.min(years + 1, 16),
        },
      },
    },
  };

  return (
    <div className={styles.wrap}>
      {ready && <Line data={data} options={options} />}
    </div>
  );
}
