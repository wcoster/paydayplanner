import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Expense, ExpenseCategory } from '../../types';
import { CATEGORY_ICONS, EXPENSE_CATEGORIES } from '../../types';
import styles from './CashFlowSection.module.css';

interface Props {
  grossIncome:         number;
  estimatedNet:        number;   // Dutch 2025 tax estimate for hint
  netIncome:           number;
  raiseRate:           number;
  expenses:            Expense[];
  allocated:           number;   // revMo + extMo + stockMo
  effectiveDebtMo:     number;
  debtPlanFixed:       boolean;
  onGrossIncomeChange: (v: number) => void;
  onNetIncomeChange:   (v: number) => void;
  onRaiseRateChange:   (v: number) => void;
  onExpensesChange:    (expenses: Expense[]) => void;
  onDebtMoChange:      (v: number) => void;
}

function newId() {
  return 'exp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export default function CashFlowSection({
  grossIncome, estimatedNet, netIncome, raiseRate, expenses, allocated,
  effectiveDebtMo, debtPlanFixed,
  onGrossIncomeChange, onNetIncomeChange, onRaiseRateChange, onExpensesChange, onDebtMoChange,
}: Props) {
  const { t }       = useTranslation();
  const grossId     = useId();
  const incomeId    = useId();
  const raiseId     = useId();
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState<ExpenseCategory>('other');
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0) + effectiveDebtMo;
  const freeBudget    = netIncome - totalExpenses;
  const surplus       = freeBudget - allocated;
  const overBudget    = surplus < 0;

  function updateExpense(id: string, patch: Partial<Expense>) {
    onExpensesChange(expenses.map(e => e.id === id ? { ...e, ...patch } : e));
  }
  function deleteExpense(id: string) {
    onExpensesChange(expenses.filter(e => e.id !== id));
  }
  function commitAdd() {
    const amt = parseFloat(newAmount);
    if (!newLabel.trim() || !amt || amt <= 0) return;
    onExpensesChange([...expenses, { id: newId(), label: newLabel.trim(), amount: amt, category: newCat }]);
    setNewLabel(''); setNewAmount(''); setNewCat('other'); setAdding(false);
  }

  return (
    <section className={styles.section}>
      {/* ── Gross income row (primary) ── */}
      <div className={styles.grossRow}>
        <div className={styles.grossField}>
          <label htmlFor={grossId} className={styles.fieldLabel}>
            {t('wealthPlanner.cashFlow.grossIncome')}
          </label>
          <div className={styles.inputPre}>
            <span className={styles.pre}>€</span>
            <input
              id={grossId}
              type="number"
              value={grossIncome}
              step={500}
              min={0}
              onChange={e => onGrossIncomeChange(parseFloat(e.target.value) || 0)}
              className={`${styles.numInput} ${styles.grossNum}`}
            />
            <span className={styles.grossUnit}>/yr</span>
          </div>
          <p className={styles.taxHint}>
            {t('wealthPlanner.cashFlow.taxHint', { net: estimatedNet.toLocaleString() })}
          </p>
        </div>

        <div className={styles.raiseField}>
          <label htmlFor={raiseId} className={styles.fieldLabel}>
            {t('wealthPlanner.cashFlow.raiseLabel')}
          </label>
          <div className={styles.inputSuf}>
            <input
              id={raiseId}
              type="number"
              value={raiseRate}
              step={0.5}
              min={0}
              max={20}
              onChange={e => onRaiseRateChange(parseFloat(e.target.value) || 0)}
              className={`${styles.numInput} ${styles.slim}`}
            />
            <span className={styles.suf}>%/yr</span>
          </div>
        </div>
      </div>

      {/* ── Net income row ── */}
      <div className={styles.incomeRow}>
        <div className={styles.incomeField}>
          <label htmlFor={incomeId} className={styles.fieldLabel}>
            {t('wealthPlanner.cashFlow.netIncome')}
          </label>
          <div className={styles.inputPre}>
            <span className={styles.pre}>€</span>
            <input
              id={incomeId}
              type="number"
              value={netIncome}
              step={50}
              onChange={e => onNetIncomeChange(parseFloat(e.target.value) || 0)}
              className={styles.numInput}
            />
            <span className={styles.grossUnit}>/mo</span>
          </div>
        </div>
      </div>

      {/* ── Expenses list ── */}
      <div className={styles.expBlock}>
        <span className={styles.expHeading}>{t('wealthPlanner.cashFlow.expenses')}</span>

        <div className={styles.expList} role="list">
          {expenses.map(exp => (
            <ExpenseRow
              key={exp.id}
              expense={exp}
              onUpdate={patch => updateExpense(exp.id, patch)}
              onDelete={() => deleteExpense(exp.id)}
            />
          ))}
          {effectiveDebtMo > 0 && (
            <DebtRow
              amount={effectiveDebtMo}
              fixed={debtPlanFixed}
              label={t('wealthPlanner.allocation.duo')}
              onChange={onDebtMoChange}
            />
          )}
        </div>

        {adding ? (
          <div className={styles.addForm}>
            <AddCatSelect value={newCat} onChange={setNewCat} />
            <input
              type="text"
              value={newLabel}
              placeholder={t('wealthPlanner.cashFlow.labelPlaceholder')}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitAdd()}
              className={styles.addLabelInput}
              aria-label={t('wealthPlanner.cashFlow.expenseLabel')}
              autoFocus
            />
            <div className={styles.inputPre}>
              <span className={styles.pre}>€</span>
              <input
                type="number"
                value={newAmount}
                placeholder="0"
                step={10}
                min={0}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitAdd()}
                className={`${styles.numInput} ${styles.addAmountInput}`}
                aria-label={t('wealthPlanner.cashFlow.amount')}
              />
            </div>
            <button className={styles.saveBtn}   onClick={commitAdd}                    aria-label={t('wealthPlanner.cashFlow.saveExpense')}>✓</button>
            <button className={styles.cancelBtn} onClick={() => setAdding(false)}       aria-label={t('wealthPlanner.cashFlow.cancelEdit')}>×</button>
          </div>
        ) : (
          <button className={styles.addExpBtn} onClick={() => setAdding(true)}>
            + {t('wealthPlanner.cashFlow.addExpense')}
          </button>
        )}
      </div>

      {/* ── Cash flow summary ── */}
      <div className={styles.summary}>
        <div className={styles.summaryLine}>
          <span className={styles.summaryKey}>{t('wealthPlanner.cashFlow.totalExpenses')}</span>
          <span className={`${styles.summaryVal} ${styles.expenseVal}`}>
            −€{totalExpenses.toLocaleString()}
          </span>
        </div>
        <div className={styles.divider} />
        <div className={styles.summaryLine}>
          <span className={styles.summaryKey}>{t('wealthPlanner.cashFlow.freeBudget')}</span>
          <span className={`${styles.summaryVal} ${styles.freeVal} ${overBudget ? styles.freeWarn : styles.freeOk}`}>
            €{freeBudget.toLocaleString()}<span className={styles.moLabel}>/mo</span>
          </span>
          {overBudget && (
            <span className={styles.warnBadge}>
              {t('wealthPlanner.cashFlow.overAllocated', { amount: Math.abs(surplus).toLocaleString() })}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Expense row (inline-editable) ───────────────────────────────────────────

function ExpenseRow({ expense, onUpdate, onDelete }: {
  expense:  Expense;
  onUpdate: (patch: Partial<Expense>) => void;
  onDelete: () => void;
}) {
  const { t }   = useTranslation();
  const labelId = useId();
  const amtId   = useId();
  const catId   = useId();

  return (
    <div className={styles.expRow} role="listitem">
      <label htmlFor={catId} className={styles.srOnly}>{t('wealthPlanner.cashFlow.category')}</label>
      <select
        id={catId}
        value={expense.category}
        onChange={e => onUpdate({ category: e.target.value as ExpenseCategory })}
        className={styles.catIcon}
        title={t(`wealthPlanner.cashFlow.categories.${expense.category}`)}
      >
        {EXPENSE_CATEGORIES.map(c => (
          <option key={c} value={c}>{CATEGORY_ICONS[c]}</option>
        ))}
      </select>

      <label htmlFor={labelId} className={styles.srOnly}>{t('wealthPlanner.cashFlow.expenseLabel')}</label>
      <input
        id={labelId}
        type="text"
        value={expense.label}
        placeholder={t(`wealthPlanner.cashFlow.categories.${expense.category}`)}
        onChange={e => onUpdate({ label: e.target.value })}
        className={styles.expLabel}
        aria-label={t('wealthPlanner.cashFlow.expenseLabel')}
      />

      <div className={styles.inputPre}>
        <span className={styles.pre}>€</span>
        <label htmlFor={amtId} className={styles.srOnly}>{t('wealthPlanner.cashFlow.amount')}</label>
        <input
          id={amtId}
          type="number"
          value={expense.amount}
          step={10}
          min={0}
          onChange={e => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
          className={`${styles.numInput} ${styles.expAmt}`}
        />
      </div>

      <button
        className={styles.deleteBtn}
        onClick={onDelete}
        aria-label={`${t('wealthPlanner.cashFlow.deleteExpense')} ${expense.label}`}
      >×</button>
    </div>
  );
}

// ── Fixed debt repayment row ─────────────────────────────────────────────────

function DebtRow({ amount, fixed, label, onChange }: {
  amount:   number;
  fixed:    boolean;
  label:    string;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const amtId = useId();
  return (
    <div className={styles.expRow} role="listitem">
      <span className={styles.catIcon}>💳</span>
      <span className={styles.expLabel}>{label}</span>
      <div className={styles.inputPre}>
        <span className={styles.pre}>€</span>
        <label htmlFor={amtId} className={styles.srOnly}>{t('wealthPlanner.cashFlow.amount')}</label>
        {fixed ? (
          <span className={`${styles.numInput} ${styles.expAmt}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {amount.toLocaleString()}
          </span>
        ) : (
          <input
            id={amtId}
            type="number"
            value={amount}
            step={10}
            min={0}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className={`${styles.numInput} ${styles.expAmt}`}
          />
        )}
      </div>
    </div>
  );
}

// ── Category select used in the "add expense" form ──────────────────────────

function AddCatSelect({ value, onChange }: { value: ExpenseCategory; onChange: (c: ExpenseCategory) => void }) {
  const { t } = useTranslation();
  const id    = useId();
  return (
    <>
      <label htmlFor={id} className={styles.srOnly}>{t('wealthPlanner.cashFlow.category')}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value as ExpenseCategory)}
        className={styles.addCatSelect}
      >
        {EXPENSE_CATEGORIES.map(c => (
          <option key={c} value={c}>
            {CATEGORY_ICONS[c]} {t(`wealthPlanner.cashFlow.categories.${c}`)}
          </option>
        ))}
      </select>
    </>
  );
}
