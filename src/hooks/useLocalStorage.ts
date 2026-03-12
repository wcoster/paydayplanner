import { useState, useEffect } from 'react';

/**
 * Drop-in replacement for useState that persists to localStorage.
 * On first load, merges stored value with defaultValue so new fields
 * added to the shape don't break existing cached data.
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      const parsed = JSON.parse(stored) as T;
      // Merge so that newly added fields always get their default
      if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable or quota exceeded — fail silently
    }
  }, [key, value]);

  return [value, setValue];
}
