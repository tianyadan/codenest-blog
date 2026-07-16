import { describe, expect, it } from 'vitest';
import {
  findLocalizedArticle,
  getLocalizedArticles,
  getLocalizedQuestionBanks,
  getLocalizedQuestions
} from './localizedContent';

describe('localizedContent', () => {
  it('filters content by language without cross-language fallback', () => {
    expect(getLocalizedArticles('zh').length).toBeGreaterThan(0);
    expect(getLocalizedArticles('en').length).toBeGreaterThan(0);
    expect(getLocalizedQuestions('en')).toHaveLength(0);
    expect(getLocalizedQuestionBanks('en')).toHaveLength(0);
  });

  it('finds articles by slug within the requested language only', () => {
    expect(findLocalizedArticle('seatunnel-data-sync', 'zh')?.title).toContain('SeaTunnel');
    expect(findLocalizedArticle('seatunnel-data-sync', 'en')?.title).toContain('SeaTunnel');
  });
});
