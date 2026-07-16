import { describe, expect, it } from 'vitest';
import { articles, loadArticleContent, questionBanks, questions } from '../data/content';
import { loadSearchableContent } from '../data/searchCorpus';

describe('markdown content catalog', () => {
  it('loads article and question metadata from content markdown files', () => {
    expect(articles.length).toBeGreaterThanOrEqual(5);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questionBanks.map((bank) => bank.slug).sort()).toEqual(['java', 'mysql']);
    expect(articles.some((article) => article.slug === 'spring-cache-consistency')).toBe(true);
  });

  it('lazy-loads article markdown body by slug', async () => {
    const content = await loadArticleContent('spring-cache-consistency');
    expect(content).toContain('旁路缓存模式');
    expect(content).not.toContain('title: Spring');
  });

  it('builds searchable corpus from markdown bodies', async () => {
    const corpus = await loadSearchableContent();
    expect(corpus.some((item) => item.slug === 'mysql-index-invalid' && item.body.includes('EXPLAIN'))).toBe(true);
  });
});
