import { describe, expect, it } from 'vitest';
import { appRoutes, buildArticlePath, buildPromptPath, buildQuestionBankPath, buildQuestionPath } from './routes';

describe('routes', () => {
  it('uses English route segments for main content pages', () => {
    expect(appRoutes.articles).toBe('/articles');
    expect(appRoutes.questions).toBe('/questions');
    expect(appRoutes.questionBank).toBe('/questions/:bankSlug');
    expect(appRoutes.questionDetail).toBe('/questions/:bankSlug/:slug');
    expect(appRoutes.prompts).toBe('/prompts');
    expect(appRoutes.promptDetail).toBe('/prompts/:slug');
    expect(appRoutes.tags).toBe('/tags');
    expect(appRoutes.search).toBe('/search');
  });

  it('builds encoded detail paths under English bases', () => {
    expect(buildArticlePath('spring-缓存一致性')).toBe('/articles/spring-%E7%BC%93%E5%AD%98%E4%B8%80%E8%87%B4%E6%80%A7');
    expect(buildQuestionBankPath('java')).toBe('/questions/java');
    expect(buildQuestionPath('java', 'java-hashmap')).toBe('/questions/java/java-hashmap');
    expect(buildPromptPath('busy-timeline-drawer')).toBe('/prompts/busy-timeline-drawer');
  });
});
