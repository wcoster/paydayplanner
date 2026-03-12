import { useTranslation } from 'react-i18next';
import type { PlannerInputs } from '../../types';
import InputGroup from '../ui/InputGroup/InputGroup';
import styles from './InputGrid.module.css';

interface Props {
  inputs:   PlannerInputs;
  onChange: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
}

export default function InputGrid({ inputs, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.grid}>
      <div className={styles.section}>
        <h3>{t('wealthPlanner.sections.bank')}</h3>
        <InputGroup label={t('wealthPlanner.sections.startAmount')}          value={inputs.revInit}  onChange={v => onChange('revInit',  v)} />
        <InputGroup label={t('wealthPlanner.sections.monthlyDeposit')}       value={inputs.revMo}    onChange={v => onChange('revMo',    v)} />
        <div className={styles.tierRow}>
          <InputGroup label={t('wealthPlanner.sections.interestUpToThreshold')} value={inputs.revRate1} step={0.1} onChange={v => onChange('revRate1', v)} />
          <InputGroup label={t('wealthPlanner.sections.threshold')}              value={inputs.revTier}  step={100} onChange={v => onChange('revTier',  v)} />
        </div>
        <InputGroup label={t('wealthPlanner.sections.interestAboveThreshold')} value={inputs.revRate2} step={0.1} onChange={v => onChange('revRate2', v)} />
      </div>

      <div className={styles.section}>
        <h3>{t('wealthPlanner.sections.deposit')}</h3>
        <InputGroup label={t('wealthPlanner.sections.startAmount')}    value={inputs.extInit} onChange={v => onChange('extInit', v)} />
        <InputGroup label={t('wealthPlanner.sections.monthlyDeposit')} value={inputs.extMo}   onChange={v => onChange('extMo',   v)} />
        <InputGroup label={t('wealthPlanner.sections.annualInterest')} value={inputs.extRate} step={0.1} onChange={v => onChange('extRate', v)} />
      </div>

      <div className={`${styles.section} ${styles.debt}`}>
        <h3>{t('wealthPlanner.sections.duo')}</h3>
        <InputGroup label={t('wealthPlanner.sections.debtAmount')}      value={inputs.debtInit} onChange={v => onChange('debtInit', v)} variant="debt" />
        <InputGroup label={t('wealthPlanner.sections.monthlyRepayment')} value={inputs.debtMo}  onChange={v => onChange('debtMo',   v)} variant="debt" />
        <InputGroup label={t('wealthPlanner.sections.annualInterest')}  value={inputs.debtRate} step={0.01} onChange={v => onChange('debtRate', v)} variant="debt" />
        <p className={styles.note}>{t('wealthPlanner.sections.duoNote')}</p>
      </div>
    </div>
  );
}
