import { useTranslation } from 'react-i18next';
import styles from './IncomeBar.module.css';

interface Props {
  freeIncome: number;
  raiseRate:  number;
  revMo:      number;
  extMo:      number;
  debtMo:     number;
  onFreeIncomeChange: (v: number) => void;
  onRaiseRateChange:  (v: number) => void;
}

export default function IncomeBar({
  freeIncome, raiseRate, revMo, extMo, debtMo,
  onFreeIncomeChange, onRaiseRateChange,
}: Props) {
  const { t } = useTranslation();

  const allocated = revMo + extMo + debtMo;
  const remaining = freeIncome - allocated;

  const remClass = remaining > 0 ? styles.positive : remaining < 0 ? styles.negative : styles.zero;
  const remLabel = remaining > 0
    ? t('wealthPlanner.income.over',   { amount: remaining.toLocaleString() })
    : remaining < 0
      ? t('wealthPlanner.income.short', { amount: Math.abs(remaining).toLocaleString() })
      : t('wealthPlanner.income.perfect');

  return (
    <div className={styles.bar}>
      <div className={styles.incomeLabel}>
        <span className={styles.incomeIcon}>💰</span>
        <span>{t('wealthPlanner.income.label')}</span>
      </div>

      <div className={styles.incomeInputWrap}>
        <span className={styles.euro}>€</span>
        <input
          type="number"
          value={freeIncome}
          onChange={e => onFreeIncomeChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className={styles.raiseWrap}>
        <span className={styles.raiseLabel}>{t('wealthPlanner.income.raiseLabel')}</span>
        <div className={styles.raiseInputWrap}>
          <input
            type="number"
            value={raiseRate}
            step={0.5}
            onChange={e => onRaiseRateChange(parseFloat(e.target.value) || 0)}
          />
          <span className={styles.raisePct}>%</span>
        </div>
      </div>

      <div className={`${styles.remaining} ${remClass}`}>{remLabel}</div>
    </div>
  );
}
