import { describe, expect, it } from 'vitest';
import { toBankMarkdown, toQuestionMarkdown } from './question-bank-migration.mjs';

describe('question bank migration formatter', () => {
  it('keeps the original question title and answer body unchanged', () => {
    const answer = '## 原始回答\n\n- 保留这段 Markdown\n- 不做 AI 改写\n';
    const markdown = toQuestionMarkdown(
      {
        id: 209313531476,
        name: 'Java8 有哪些新特性？',
        answer,
        tags: 'Java,并发',
        difficulty: 'medium',
        source: '面试鸭'
      },
      'Java 真题知识库'
    );

    expect(markdown).toContain('title: "Java8 有哪些新特性？"');
    expect(markdown).toContain('source: "面试鸭"');
    expect(markdown).toContain(`## 答案\n\n${answer}`);
  });

  it('writes bank metadata without changing its name or description', () => {
    const markdown = toBankMarkdown({
      id: 5,
      name: 'Java知识库',
      description: '后端开发的中坚力量，刷题才能更稳。',
      tags: 'backend'
    });

    expect(markdown).toContain('name: "Java知识库"');
    expect(markdown).toContain('description: "后端开发的中坚力量，刷题才能更稳。"');
  });
});
