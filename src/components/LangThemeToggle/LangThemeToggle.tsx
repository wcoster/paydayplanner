import { useTranslation } from 'react-i18next';
import { useTheme, THEMES, type Theme } from '../../hooks/useTheme';
import styles from './LangThemeToggle.module.css';

const LANGS = [
  { code: 'nl', label: 'NL' },
  { code: 'en', label: 'EN' },
] as const;

const THEME_ICONS: Record<Theme, string> = {
  aurora: '🌌',
  hockey: '🏑',
  safari: '🌅',
};

export default function LangThemeToggle() {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useTheme();

  const activeLang = i18n.language?.slice(0, 2) ?? 'nl';

  return (
    <div className={styles.wrap}>
      {/* Language */}
      <div className={styles.group}>
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            className={`${styles.btn} ${activeLang === code ? styles.active : ''}`}
            onClick={() => i18n.changeLanguage(code)}
            aria-label={`Switch to ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Theme */}
      <div className={styles.group}>
        {THEMES.map(th => (
          <button
            key={th}
            className={`${styles.btn} ${styles.themeIcon} ${theme === th ? styles.active : ''}`}
            onClick={() => setTheme(th)}
            title={th.charAt(0).toUpperCase() + th.slice(1)}
            aria-label={`Switch to ${th} theme`}
          >
            {THEME_ICONS[th]}
          </button>
        ))}
      </div>
    </div>
  );
}
