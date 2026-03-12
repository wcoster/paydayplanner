import { useTranslation } from 'react-i18next';
import styles from './StatGrid.module.css';

interface Props {
  wealth:       number;
  debtFreeText: string;
  assets:       number;
  endIncome:    number;
  years:        number;
}

export default function StatGrid({ wealth, debtFreeText, assets, endIncome, years }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid}>
      <div className={`${styles.box} ${styles.primary}`}>
        <span className={styles.label}>{t('wealthPlanner.stats.wealth', { years })}</span>
        <span className={`${styles.num} ${styles.green}`}>
          €{wealth.toLocaleString()}
        </span>
      </div>
      <div className={`${styles.box} ${styles.secondary}`}>
        <span className={styles.label}>{t('wealthPlanner.stats.debtFree')}</span>
        <span className={`${styles.num} ${styles.red}`}>{debtFreeText}</span>
      </div>
      <div className={`${styles.box} ${styles.secondary}`}>
        <span className={styles.label}>{t('wealthPlanner.stats.savings')}</span>
        <span className={`${styles.num} ${styles.blue}`}>
          €{assets.toLocaleString()}
        </span>
      </div>
      <div className={`${styles.box} ${styles.secondary}`}>
        <span className={styles.label}>{t('wealthPlanner.stats.endIncome')}</span>
        <span className={`${styles.num} ${styles.yellow}`}>
          €{endIncome.toLocaleString()}{t('wealthPlanner.optimize.perMonth')}
        </span>
      </div>
    </div>
  );
}
