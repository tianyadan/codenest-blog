import { describe, expect, it } from 'vitest';
import { appRoutes, buildArticlePath, buildQuestionPath } from './routes';

describe('routes', () => {
  it('uses Chinese route segments for main content pages', () => {
    expect(appRoutes.articles).toBe('/文章');
    expect(appRoutes.questions).toBe('/题库');
    expect(appRoutes.search).toBe('/搜索');
  });

  it('builds encoded Chinese friendly detail paths', () => {
    expect(buildArticlePath('spring-缓存一致性')).toBe('/文章/spring-%E7%BC%93%E5%AD%98%E4%B8%80%E8%87%B4%E6%80%A7');
    expect(buildQuestionPath('java-hashmap')).toBe('/题库/java-hashmap');
  });
});
