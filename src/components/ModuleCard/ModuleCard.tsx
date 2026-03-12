import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Module } from '../../modules';
import styles from './ModuleCard.module.css';

interface Props {
  module: Module;
}

export default function ModuleCard({ module }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      className={styles.card}
      style={{ '--accent': module.accent } as React.CSSProperties}
      onClick={() => navigate(module.path)}
      aria-label={`Open ${t(module.titleKey)}`}
    >
      <div className={styles.accentBar} />

      <div className={styles.iconWrap}>
        <span className={styles.icon}>{module.icon}</span>
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>{t(module.titleKey)}</h2>
        <p className={styles.description}>{t(module.descKey)}</p>
      </div>

      <div className={styles.footer}>
        <div className={styles.tags}>
          {module.tagKeys.map(key => (
            <span key={key} className={styles.tag}>{t(key)}</span>
          ))}
        </div>
        <span className={styles.arrow}>→</span>
      </div>
    </button>
  );
}
