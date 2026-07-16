import { describe, expect, it } from 'vitest';
import { articles, loadArticleContent, questionBanks, questions } from '../data/content';
import { loadSearchableContent } from '../data/searchCorpus';
import { getLocalizedArticles, getLocalizedQuestionBanks } from '../lib/localizedContent';

describe('markdown content catalog', () => {
  it('loads article and question metadata from language content trees', () => {
    expect(articles.length).toBeGreaterThanOrEqual(5);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(articles.every((article) => article.lang === 'zh' || article.lang === 'en')).toBe(true);
    expect(getLocalizedQuestionBanks('zh').map((bank) => bank.slug).sort()).toEqual(['java', 'mysql']);
    expect(getLocalizedArticles('zh').some((article) => article.slug === 'spring-cache-consistency')).toBe(true);
    expect(getLocalizedArticles('zh').some((article) => article.slug === 'seatunnel-data-sync')).toBe(true);
    expect(getLocalizedArticles('en')).toHaveLength(0);
    expect(questionBanks.every((bank) => bank.lang === 'zh' || bank.lang === 'en')).toBe(true);
  });

  it('lazy-loads article markdown body by slug and language', async () => {
    const content = await loadArticleContent('spring-cache-consistency', 'zh');
    expect(content).toContain('旁路缓存模式');
    expect(content).not.toContain('title: Spring');
    expect(await loadArticleContent('spring-cache-consistency', 'en')).toBeNull();
  });

  it('builds searchable corpus from markdown bodies and filters by language', async () => {
    const zhCorpus = await loadSearchableContent('zh');
    expect(zhCorpus.some((item) => item.slug === 'mysql-index-invalid' && item.body.includes('EXPLAIN'))).toBe(true);
    expect(zhCorpus.every((item) => item.lang === 'zh')).toBe(true);

    const enCorpus = await loadSearchableContent('en');
    expect(enCorpus).toHaveLength(0);
  });
});
