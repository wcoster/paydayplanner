// Re-export everything from the context so existing imports don't break.
// The real implementation (shared state) lives in ThemeContext.tsx.
export type { Theme } from '../context/ThemeContext';
export { THEMES, useTheme } from '../context/ThemeContext';
