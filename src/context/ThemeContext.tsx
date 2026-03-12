import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type Theme = 'aurora' | 'hockey' | 'safari';
export const THEMES: Theme[] = ['aurora', 'hockey', 'safari'];

type Ctx = [Theme, (t: Theme) => void];

const ThemeContext = createContext<Ctx>(['aurora', () => {}]);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'aurora');

  // Single place that applies data-theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use this everywhere — all callers share the same state. */
export function useTheme(): Ctx {
  return useContext(ThemeContext);
}
