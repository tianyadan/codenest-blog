import { describe, expect, it } from 'vitest';
import type { Article } from '../types/content';
import { getArticleCategories, getArticlesByCategory } from './articles';

const articleFixtures: Article[] = [
  {
    id: 'a1',
    lang: 'zh',
    slug: 'spring-cache',
    title: 'Spring 缓存',
    summary: '缓存实践',
    author: 'CodeNest',
    category: 'learning',
    tags: ['Spring'],
    createdAt: '2026-07-13',
    updatedAt: '2026-07-13',
    readingMinutes: 6,
    content: '# Spring 缓存'
  },
  {
    id: 'a2',
    lang: 'zh',
    slug: 'work-summary',
    title: '工作总结',
    summary: '项目复盘',
    author: 'CodeNest',
    category: 'work',
    tags: ['复盘'],
    createdAt: '2026-07-12',
    updatedAt: '2026-07-12',
    readingMinutes: 8,
    content: '# 工作总结'
  }
];

describe('article helpers', () => {
  it('returns all articles when category is all', () => {
    expect(getArticlesByCategory(articleFixtures, 'all')).toHaveLength(2);
  });

  it('filters articles by category', () => {
    expect(getArticlesByCategory(articleFixtures, 'learning').map((article) => article.slug)).toEqual(['spring-cache']);
  });

  it('counts categories for sidebar display', () => {
    expect(getArticleCategories(articleFixtures)).toEqual([
      { category: 'learning', count: 1 },
      { category: 'work', count: 1 }
    ]);
  });
});
