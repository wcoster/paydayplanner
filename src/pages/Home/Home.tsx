import { useTranslation } from 'react-i18next';
import { MODULES } from '../../modules';
import ModuleCard from '../../components/ModuleCard/ModuleCard';
import styles from './Home.module.css';

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.heroIcon}>🏠</div>
          <div>
            <h1 className={styles.heroTitle}>{t('home.title')}</h1>
            <p className={styles.heroSub}>{t('home.subtitle')}</p>
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>{t('home.sectionModules')}</h2>
          <div className={styles.grid}>
            {MODULES.map(mod => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
            <div className={styles.comingSoon}>
              <span className={styles.comingSoonIcon}>＋</span>
              <span className={styles.comingSoonText}>{t('home.comingSoon')}</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
