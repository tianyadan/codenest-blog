import { describe, expect, it } from 'vitest';
import { getDictionary, normalizeLanguage } from './i18n';

describe('i18n', () => {
  it('falls back to Chinese for unsupported language values', () => {
    expect(normalizeLanguage('fr')).toBe('zh');
  });

  it('returns localized navigation labels', () => {
    expect(getDictionary('zh').nav.articles).toBe('文章');
    expect(getDictionary('en').nav.articles).toBe('Articles');
  });
});
