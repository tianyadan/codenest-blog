import { describe, expect, it } from 'vitest';
import { articles, loadArticleContent, loadPromptContent, prompts, questionBanks, questions } from '../data/content';
import { loadSearchableContent } from '../data/searchCorpus';
import { getLocalizedArticles, getLocalizedPrompts, getLocalizedQuestionBanks } from '../lib/localizedContent';

describe('markdown content catalog', () => {
  it('loads article, prompt and question metadata from language content trees', () => {
    expect(articles.length).toBeGreaterThanOrEqual(2);
    expect(prompts.length).toBeGreaterThanOrEqual(9);
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(articles.every((article) => article.lang === 'zh' || article.lang === 'en')).toBe(true);
    expect(getLocalizedQuestionBanks('zh').map((bank) => bank.slug)).toEqual([
      'mysql',
      'redis',
      'java',
      'spring',
      'vue',
      'react',
      'go',
      'data-structures'
    ]);
    expect(getLocalizedArticles('zh').some((article) => article.slug === 'seatunnel-data-sync')).toBe(true);
    expect(getLocalizedArticles('en').some((article) => article.slug === 'seatunnel-data-sync')).toBe(true);
    expect(getLocalizedPrompts('zh').some((prompt) => prompt.slug === 'busy-timeline-drawer')).toBe(true);
    expect(getLocalizedPrompts('en').some((prompt) => prompt.category === 'schema')).toBe(true);
    expect(questionBanks.every((bank) => bank.lang === 'zh' || bank.lang === 'en')).toBe(true);
  });

  it('lazy-loads article and prompt markdown bodies by slug and language', async () => {
    const zhContent = await loadArticleContent('seatunnel-data-sync', 'zh');
    expect(zhContent).toContain('批次同步配置');
    expect(zhContent).not.toContain('title: SeaTunnel');

    const enContent = await loadArticleContent('seatunnel-data-sync', 'en');
    expect(enContent).toContain('Batch sync config');
    expect(enContent).not.toContain('title: SeaTunnel');

    const zhPrompt = await loadPromptContent('busy-timeline-drawer', 'zh');
    expect(zhPrompt).toContain('忙碌时间轴');
    expect(zhPrompt).not.toContain('title: 日程抽屉');

    const enPrompt = await loadPromptContent('busy-timeline-drawer', 'en');
    expect(enPrompt).toContain('Busy Timeline');
    expect(enPrompt).not.toContain('title: Schedule Drawer');
  });

  it('builds searchable corpus from markdown bodies and filters by language', async () => {
    const zhCorpus = await loadSearchableContent('zh');
    expect(zhCorpus.some((item) => item.slug === 'mysql-index-invalid' && item.body.includes('EXPLAIN'))).toBe(true);
    expect(zhCorpus.some((item) => item.slug === 'seatunnel-data-sync' && item.lang === 'zh')).toBe(true);
    expect(zhCorpus.some((item) => item.type === 'prompt' && item.slug === 'backend-api-design')).toBe(true);
    expect(zhCorpus.every((item) => item.lang === 'zh')).toBe(true);

    const enCorpus = await loadSearchableContent('en');
    expect(enCorpus.some((item) => item.slug === 'seatunnel-data-sync' && item.lang === 'en')).toBe(true);
    expect(enCorpus.some((item) => item.type === 'prompt' && item.slug === 'schema-table-design')).toBe(true);
    expect(enCorpus.every((item) => item.lang === 'en')).toBe(true);
  });
});

