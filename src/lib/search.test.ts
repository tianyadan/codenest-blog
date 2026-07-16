import { describe, expect, it } from 'vitest';
import type { SearchableContent } from '../types/content';
import { searchContent } from './search';

const searchableContent: SearchableContent[] = [
  {
    id: 'article-1',
    lang: 'zh',
    type: 'article',
    slug: 'spring-cache',
    title: 'Spring 缓存一致性',
    summary: '讲解 Redis 与数据库双写一致性',
    tags: ['Spring', 'Redis'],
    body: '延迟双删、旁路缓存、缓存击穿'
  },
  {
    id: 'question-1',
    lang: 'zh',
    type: 'question',
    slug: 'mysql-index',
    title: 'MySQL 索引为什么会失效',
    summary: '八股文题目',
    tags: ['MySQL'],
    body: '函数计算、隐式转换、最左前缀'
  }
];

describe('searchContent', () => {
  it('searches title, summary, tags and body case-insensitively', () => {
    const results = searchContent(searchableContent, 'redis');

    expect(results).toHaveLength(1);
    expect(results[0].item.slug).toBe('spring-cache');
  });

  it('returns all content with score 0 when query is blank', () => {
    const results = searchContent(searchableContent, '   ');

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.score === 0)).toBe(true);
  });
});
