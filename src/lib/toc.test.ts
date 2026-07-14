import { describe, expect, it } from 'vitest';
import { extractTableOfContents } from './toc';

describe('extractTableOfContents', () => {
  it('extracts markdown headings with stable slugs', () => {
    const toc = extractTableOfContents(`
# 标题
## 缓存一致性
### Redis 方案
## 缓存一致性
`);

    expect(toc).toEqual([
      { id: '缓存一致性', level: 2, text: '缓存一致性' },
      { id: 'redis-方案', level: 3, text: 'Redis 方案' },
      { id: '缓存一致性-2', level: 2, text: '缓存一致性' }
    ]);
  });
});
