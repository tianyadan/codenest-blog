import type { PromptCategory } from '../types/content';

export const promptCategoryLabels: Record<PromptCategory, { zh: string; en: string }> = {
  frontend: { zh: '前端', en: 'Frontend' },
  backend: { zh: '后端', en: 'Backend' },
  ui: { zh: 'UI', en: 'UI' },
  schema: { zh: '表结构设计', en: 'Schema Design' },
  'backend-test': { zh: '后端测试', en: 'Backend Testing' },
  ops: { zh: '运维', en: 'Ops' },
  sql: { zh: 'SQL 优化', en: 'SQL Optimization' },
  'code-review': { zh: 'Code Review', en: 'Code Review' },
  product: { zh: '产品需求拆解', en: 'Product Breakdown' }
};

export const orderedPromptCategories: PromptCategory[] = [
  'frontend',
  'backend',
  'ui',
  'schema',
  'backend-test',
  'ops',
  'sql',
  'code-review',
  'product'
];

export type PromptCategoryFilter = PromptCategory | 'all';

type CategorizedPrompt = {
  category: PromptCategory;
};

/** 按分类过滤提示词。 */
export const getPromptsByCategory = <T extends CategorizedPrompt>(
  prompts: T[],
  category: PromptCategoryFilter
) => {
  if (category === 'all') {
    return prompts;
  }

  return prompts.filter((prompt) => prompt.category === category);
};

/** 汇总各分类数量，供侧栏展示。 */
export const getPromptCategories = (prompts: CategorizedPrompt[]) => {
  const categoryCount = new Map<PromptCategory, number>();

  prompts.forEach((prompt) => {
    categoryCount.set(prompt.category, (categoryCount.get(prompt.category) ?? 0) + 1);
  });

  return orderedPromptCategories.map((category) => ({
    category,
    count: categoryCount.get(category) ?? 0
  }));
};
