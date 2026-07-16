import { describe, expect, it } from 'vitest';
import { parseFrontmatter, toNumberValue, toStringArray } from './frontmatter';

describe('parseFrontmatter', () => {
  it('parses yaml frontmatter and keeps markdown body', () => {
    const parsed = parseFrontmatter(`---
title: Spring 缓存
tags: [Spring, Redis]
readingMinutes: 6
---

# Spring 缓存

正文内容
`);

    expect(parsed.data.title).toBe('Spring 缓存');
    expect(parsed.data.tags).toEqual(['Spring', 'Redis']);
    expect(parsed.data.readingMinutes).toBe(6);
    expect(parsed.content).toContain('# Spring 缓存');
    expect(parsed.content).toContain('正文内容');
  });

  it('supports multiline tag arrays', () => {
    const parsed = parseFrontmatter(`---
title: Demo
tags:
  - Java
  - 并发
---

答案
`);

    expect(toStringArray(parsed.data.tags)).toEqual(['Java', '并发']);
    expect(parsed.content.trim()).toBe('答案');
  });

  it('returns whole file as content when frontmatter is missing', () => {
    const parsed = parseFrontmatter('# Only body\n\nhello');
    expect(parsed.data).toEqual({});
    expect(parsed.content).toContain('# Only body');
  });
});

describe('frontmatter helpers', () => {
  it('normalizes numbers from strings', () => {
    expect(toNumberValue('12')).toBe(12);
    expect(toNumberValue('x')).toBeUndefined();
  });
});
