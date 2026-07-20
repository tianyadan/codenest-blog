import { describe, expect, it } from 'vitest';
import { getPromptCategories, getPromptsByCategory, orderedPromptCategories } from './prompts';

describe('prompts helpers', () => {
  it('keeps a stable category order for navigation', () => {
    expect(orderedPromptCategories).toEqual([
      'frontend',
      'backend',
      'ui',
      'schema',
      'backend-test',
      'ops',
      'sql',
      'code-review',
      'product'
    ]);
  });

  it('filters prompts by category and counts sidebar totals', () => {
    const prompts = [
      { category: 'frontend' as const },
      { category: 'frontend' as const },
      { category: 'backend' as const }
    ];

    expect(getPromptsByCategory(prompts, 'frontend')).toHaveLength(2);
    expect(getPromptCategories(prompts).find((item) => item.category === 'frontend')?.count).toBe(2);
    expect(getPromptCategories(prompts).find((item) => item.category === 'ui')?.count).toBe(0);
  });
});
