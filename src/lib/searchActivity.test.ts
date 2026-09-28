import { describe, expect, it } from 'vitest';
import type { Article, Prompt, QuestionItem } from '../types/content';
import { buildLatestActivity } from './searchActivity';

const article = (slug: string, createdAt: string): Article => ({
  id: `a-${slug}`,
  lang: 'zh',
  slug,
  title: `文章 ${slug}`,
  summary: '',
  author: 'evan',
  category: 'learning',
  tags: [],
  createdAt,
  updatedAt: createdAt,
  readingMinutes: 1,
  content: ''
});

const prompt = (slug: string, createdAt: string): Prompt => ({
  id: `p-${slug}`,
  lang: 'zh',
  slug,
  title: `提示词 ${slug}`,
  summary: '',
  author: 'evan',
  category: 'backend',
  tags: [],
  createdAt,
  updatedAt: createdAt,
  content: ''
});

const question = (slug: string): QuestionItem => ({
  id: `q-${slug}`,
  lang: 'zh',
  slug,
  bankSlug: 'java',
  title: `题目 ${slug}`,
  description: '',
  answer: '',
  tags: [],
  difficulty: 'easy'
});

describe('buildLatestActivity', () => {
  it('puts newer articles and prompts first and keeps question links', () => {
    const items = buildLatestActivity(
      [article('old', '2025-01-01'), article('new', '2026-09-21')],
      [prompt('prompt', '2026-08-01')],
      [question('q1'), question('q2'), question('q3')],
      6
    );

    expect(items[0]).toMatchObject({ type: 'article', title: '文章 new', href: '/articles/new' });
    expect(items.some((item) => item.type === 'prompt' && item.href === '/prompts/prompt')).toBe(true);
    expect(items.some((item) => item.type === 'question' && item.href.includes('/questions/java/'))).toBe(true);
  });
});
