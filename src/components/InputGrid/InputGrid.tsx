import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { DuoPlan, PlannerInputs } from '../../types';
import { duoPlanYears, DUO_THRESHOLD } from '../../utils/simulation';
import InputGroup from '../ui/InputGroup/InputGroup';
import styles from './InputGrid.module.css';

interface Props {
  inputs:   PlannerInputs;
  onChange: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
}

export default function InputGrid({ inputs, onChange }: Props) {
  const { t }   = useTranslation();
  const planId  = useId();

  const isDuo          = inputs.debtPlan !== 'manual';
  const forgivenessYrs = isDuo ? duoPlanYears(inputs.debtPlan) : null;

  return (
    <div className={styles.grid}>
      {/* Current account */}
      <div className={styles.section}>
        <h3 className={styles.heading}>{t('wealthPlanner.accounts.bank')}</h3>
        <InputGroup
          label={t('wealthPlanner.accounts.startAmount')}
          value={inputs.revInit}
          step={500}
          onChange={v => onChange('revInit', v)}
        />
        <div className={styles.tierRow}>
          <InputGroup
            label={t('wealthPlanner.accounts.interestUpToThreshold')}
            value={inputs.revRate1}
            step={0.05}
            onChange={v => onChange('revRate1', v)}
          />
          <InputGroup
            label={t('wealthPlanner.accounts.threshold')}
            value={inputs.revTier}
            step={1000}
            onChange={v => onChange('revTier', v)}
          />
        </div>
        <InputGroup
          label={t('wealthPlanner.accounts.interestAboveThreshold')}
          value={inputs.revRate2}
          step={0.05}
          onChange={v => onChange('revRate2', v)}
        />
      </div>

      {/* Savings account */}
      <div className={styles.section}>
        <h3 className={styles.heading}>{t('wealthPlanner.accounts.deposit')}</h3>
        <InputGroup
          label={t('wealthPlanner.accounts.startAmount')}
          value={inputs.extInit}
          step={500}
          onChange={v => onChange('extInit', v)}
        />
        <InputGroup
          label={t('wealthPlanner.accounts.annualInterest')}
          value={inputs.extRate}
          step={0.1}
          onChange={v => onChange('extRate', v)}
        />
      </div>

      {/* Stocks */}
      <div className={`${styles.section} ${styles.stocks}`}>
        <h3 className={styles.heading}>{t('wealthPlanner.accounts.stocks')}</h3>
        <InputGroup
          label={t('wealthPlanner.accounts.startAmount')}
          value={inputs.stockInit}
          step={500}
          onChange={v => onChange('stockInit', v)}
        />
        <InputGroup
          label={t('wealthPlanner.accounts.expectedReturn')}
          value={inputs.stockRate}
          step={0.5}
          onChange={v => onChange('stockRate', v)}
        />
        <p className={styles.note}>{t('wealthPlanner.accounts.stocksNote')}</p>
      </div>

      {/* Student loan */}
      <div className={`${styles.section} ${styles.debt}`}>
        <h3 className={styles.heading}>{t('wealthPlanner.accounts.duo')}</h3>

        {/* Plan selector */}
        <div className={styles.planRow}>
          <label htmlFor={planId} className={styles.planLabel}>
            {t('wealthPlanner.accounts.duoPlan')}
          </label>
          <select
            id={planId}
            className={styles.planSelect}
            value={inputs.debtPlan}
            onChange={e => onChange('debtPlan', e.target.value as DuoPlan)}
          >
            <option value="manual">{t('wealthPlanner.accounts.duoPlanManual')}</option>
            <option value="sf15">{t('wealthPlanner.accounts.duoPlanSf15')}</option>
            <option value="sf35">{t('wealthPlanner.accounts.duoPlanSf35')}</option>
          </select>
        </div>

        <InputGroup
          label={t('wealthPlanner.accounts.debtAmount')}
          value={inputs.debtInit}
          step={500}
          variant="debt"
          onChange={v => onChange('debtInit', v)}
        />
        <InputGroup
          label={t('wealthPlanner.accounts.annualInterest')}
          value={inputs.debtRate}
          step={0.01}
          variant="debt"
          onChange={v => onChange('debtRate', v)}
        />

        {isDuo ? (
          <>
            <p className={styles.duoForgivenessRow}>
              {t('wealthPlanner.accounts.duoForgiveness', { years: forgivenessYrs })}
            </p>
            <p className={styles.note}>
              {t('wealthPlanner.accounts.duoPlanNote', { threshold: DUO_THRESHOLD.toLocaleString() })}
            </p>
          </>
        ) : (
          <p className={styles.note}>{t('wealthPlanner.accounts.duoNote')}</p>
        )}
      </div>
    </div>
  );
}
