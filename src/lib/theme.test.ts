import { describe, expect, it } from 'vitest';
import { normalizeTheme, resolveNextTheme } from './theme';

describe('theme', () => {
  it('falls back to light theme for invalid values', () => {
    expect(normalizeTheme('system')).toBe('light');
  });

  it('toggles between light and dark themes', () => {
    expect(resolveNextTheme('light')).toBe('dark');
    expect(resolveNextTheme('dark')).toBe('light');
  });
});
