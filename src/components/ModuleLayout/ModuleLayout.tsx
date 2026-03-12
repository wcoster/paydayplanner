import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ModuleLayout.module.css';

interface Props {
  children: React.ReactNode;
}

export default function ModuleLayout({ children }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.container}>
        <div className={`glass ${styles.card}`}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/')}
            aria-label={t('common.backToHub')}
          >
            <span className={styles.backArrow}>←</span>
            <span className={styles.backLabel}>🏠 {t('common.backToHub')}</span>
          </button>

          {children}
        </div>
      </div>
    </>
  );
}
