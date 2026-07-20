import { describe, expect, it } from 'vitest';
import {
  findLocalizedArticle,
  findLocalizedPrompt,
  findLocalizedQuestionBank,
  getLocalizedArticles,
  getLocalizedPrompts,
  getLocalizedQuestionBanks,
  getLocalizedQuestions,
  getQuestionsByBank
} from './localizedContent';

describe('localizedContent', () => {
  it('filters content by language without cross-language fallback', () => {
    expect(getLocalizedArticles('zh').length).toBeGreaterThan(0);
    expect(getLocalizedArticles('en').length).toBeGreaterThan(0);
    expect(getLocalizedPrompts('zh').length).toBeGreaterThan(0);
    expect(getLocalizedPrompts('en').length).toBeGreaterThan(0);
    expect(getLocalizedQuestions('zh').length).toBeGreaterThan(0);
    expect(getLocalizedQuestions('en').length).toBeGreaterThan(0);
    expect(getLocalizedQuestionBanks('zh').length).toBeGreaterThanOrEqual(8);
    expect(getLocalizedQuestionBanks('en').length).toBeGreaterThanOrEqual(8);
  });

  it('finds articles by slug within the requested language only', () => {
    expect(findLocalizedArticle('seatunnel-data-sync', 'zh')?.title).toContain('SeaTunnel');
    expect(findLocalizedArticle('seatunnel-data-sync', 'en')?.title).toContain('SeaTunnel');
  });

  it('keeps question banks ordered and scoped by bank slug', () => {
    const banks = getLocalizedQuestionBanks('zh');
    expect(banks.map((bank) => bank.slug)).toEqual([
      'mysql',
      'redis',
      'java',
      'spring',
      'vue',
      'react',
      'go',
      'data-structures'
    ]);
    expect(findLocalizedQuestionBank('redis', 'zh')?.name).toBe('Redis');
    expect(getQuestionsByBank('mysql', 'zh').every((item) => item.bankSlug === 'mysql')).toBe(true);
  });

  it('finds prompts by slug within the requested language only', () => {
    expect(findLocalizedPrompt('busy-timeline-drawer', 'zh')?.category).toBe('frontend');
    expect(findLocalizedPrompt('busy-timeline-drawer', 'en')?.title).toContain('Busy Timeline');
  });
});

