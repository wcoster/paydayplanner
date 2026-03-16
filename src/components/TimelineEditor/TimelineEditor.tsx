import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineEvent, TimelineEventType } from '../../types';
import styles from './TimelineEditor.module.css';

interface Props {
  events:   TimelineEvent[];
  maxYear:  number;
  onChange: (events: TimelineEvent[]) => void;
}

const EMPTY_FORM = {
  year: 1,
  type: 'deposito' as TimelineEventType,
  amount: 10000,
  label: '',
  depositoDuration: 3,
  depositoRate: 3.5,
};

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function TimelineEditor({ events, maxYear, onChange }: Props) {
  const { t } = useTranslation();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  function updateForm<K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleAdd() {
    const ev: TimelineEvent = {
      id: editId ?? newId(),
      year: form.year,
      type: form.type,
      amount: form.amount,
      label: form.label || undefined,
      depositoDuration: form.type === 'deposito' ? form.depositoDuration : undefined,
      depositoRate:     form.type === 'deposito' ? form.depositoRate     : undefined,
    };
    if (editId) {
      onChange(events.map(e => e.id === editId ? ev : e));
      setEditId(null);
    } else {
      onChange([...events, ev]);
    }
    setAdding(false);
    setForm(EMPTY_FORM);
  }

  function handleEdit(ev: TimelineEvent) {
    setForm({
      year: ev.year,
      type: ev.type,
      amount: ev.amount,
      label: ev.label ?? '',
      depositoDuration: ev.depositoDuration ?? 3,
      depositoRate: ev.depositoRate ?? 3.5,
    });
    setEditId(ev.id);
    setAdding(true);
  }

  function handleDelete(id: string) {
    onChange(events.filter(e => e.id !== id));
  }

  function handleCancel() {
    setAdding(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const sorted = [...events].sort((a, b) => a.year - b.year || a.type.localeCompare(b.type));

  const typeLabel = (type: TimelineEventType) => t(`wealthPlanner.timeline.types.${type}`);
  const typeColor = (type: TimelineEventType) => ({
    deposito:        styles.tagDeposito,
    stock_lump:      styles.tagStock,
    extra_repayment: styles.tagRepayment,
  }[type]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('wealthPlanner.timeline.title')}</h2>
        {!adding && (
          <button className={styles.addBtn} onClick={() => setAdding(true)}>
            + {t('wealthPlanner.timeline.addEvent')}
          </button>
        )}
      </div>

      {adding && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor={fid('year')}>{t('wealthPlanner.timeline.form.year')}</label>
            <select id={fid('year')} value={form.year} onChange={e => updateForm('year', parseInt(e.target.value))} className={styles.formSelect}>
              {Array.from({ length: maxYear }, (_, i) => i + 1).map(y => (
                <option key={y} value={y}>{t('wealthPlanner.yearOption', { n: y })}</option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor={fid('type')}>{t('wealthPlanner.timeline.form.type')}</label>
            <select id={fid('type')} value={form.type} onChange={e => updateForm('type', e.target.value as TimelineEventType)} className={styles.formSelect}>
              <option value="deposito">{t('wealthPlanner.timeline.types.deposito')}</option>
              <option value="stock_lump">{t('wealthPlanner.timeline.types.stock_lump')}</option>
              <option value="extra_repayment">{t('wealthPlanner.timeline.types.extra_repayment')}</option>
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor={fid('amount')}>{t('wealthPlanner.timeline.form.amount')}</label>
            <div className={styles.inputWrap}>
              <span className={styles.euro}>€</span>
              <input id={fid('amount')} type="number" value={form.amount} step={500} min={0} onChange={e => updateForm('amount', parseFloat(e.target.value) || 0)} className={styles.formInput} />
            </div>
          </div>

          {form.type === 'deposito' && (
            <>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor={fid('duration')}>{t('wealthPlanner.timeline.form.duration')}</label>
                <div className={styles.inputWrap}>
                  <input id={fid('duration')} type="number" value={form.depositoDuration} step={1} min={1} max={30} onChange={e => updateForm('depositoDuration', parseInt(e.target.value) || 1)} className={styles.formInput} />
                  <span className={styles.unit}>{t('wealthPlanner.timeline.form.years')}</span>
                </div>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor={fid('rate')}>{t('wealthPlanner.timeline.form.rate')}</label>
                <div className={styles.inputWrap}>
                  <input id={fid('rate')} type="number" value={form.depositoRate} step={0.1} min={0} onChange={e => updateForm('depositoRate', parseFloat(e.target.value) || 0)} className={styles.formInput} />
                  <span className={styles.unit}>%</span>
                </div>
              </div>
            </>
          )}

          <div className={styles.formRow}>
            <label className={styles.formLabel} htmlFor={fid('label')}>{t('wealthPlanner.timeline.form.label')}</label>
            <input id={fid('label')} type="text" value={form.label} placeholder={t('wealthPlanner.timeline.form.labelPlaceholder')} onChange={e => updateForm('label', e.target.value)} className={styles.formInput} />
          </div>

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={handleCancel}>{t('wealthPlanner.timeline.form.cancel')}</button>
            <button className={styles.saveBtn} onClick={handleAdd}>{editId ? t('wealthPlanner.timeline.form.update') : t('wealthPlanner.timeline.form.save')}</button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !adding && (
        <p className={styles.empty}>{t('wealthPlanner.timeline.empty')}</p>
      )}

      <div className={styles.list}>
        {sorted.map(ev => (
          <div key={ev.id} className={styles.eventRow}>
            <div className={styles.yearBadge}>{t('wealthPlanner.yearOption', { n: ev.year })}</div>
            <span className={`${styles.typeBadge} ${typeColor(ev.type)}`}>{typeLabel(ev.type)}</span>
            <div className={styles.eventDetails}>
              <span className={styles.amount}>€{ev.amount.toLocaleString()}</span>
              {ev.type === 'deposito' && ev.depositoDuration && ev.depositoRate !== undefined && (
                <span className={styles.detail}>{ev.depositoDuration}{t('wealthPlanner.timeline.form.years')} @ {ev.depositoRate}%</span>
              )}
              {ev.label && <span className={styles.eventLabel}>{ev.label}</span>}
            </div>
            <div className={styles.actions}>
              <button className={styles.editBtn} onClick={() => handleEdit(ev)}>✏️</button>
              <button className={styles.deleteBtn} onClick={() => handleDelete(ev.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
