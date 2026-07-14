import type { ThemeMode } from '../types/content';

export const normalizeTheme = (value: unknown): ThemeMode => {
  return value === 'dark' || value === 'light' ? value : 'light';
};

export const resolveNextTheme = (theme: ThemeMode): ThemeMode => {
  return theme === 'light' ? 'dark' : 'light';
};
