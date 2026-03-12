import styles from './InputGroup.module.css';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  variant?: 'default' | 'debt';
}

export default function InputGroup({ label, value, onChange, step = 1, variant = 'default' }: Props) {
  return (
    <div className={styles.group}>
      <label className={styles.label}>{label}</label>
      <input
        type="number"
        className={`${styles.input} ${variant === 'debt' ? styles.debt : ''}`}
        value={value}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
