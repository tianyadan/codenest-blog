import type { Article, ArticleCategory } from '../types/content';

export const articleCategoryLabels: Record<ArticleCategory, { zh: string; en: string }> = {
  learning: { zh: '学习沉淀', en: 'Learning' },
  work: { zh: '工作总结', en: 'Work Notes' },
  diary: { zh: '心情日记', en: 'Diary' }
};

export type ArticleCategoryFilter = ArticleCategory | 'all';

export const getArticlesByCategory = (articles: Article[], category: ArticleCategoryFilter) => {
  if (category === 'all') {
    return articles;
  }

  return articles.filter((article) => article.category === category);
};

export const getArticleCategories = (articles: Article[]) => {
  const categoryCount = new Map<ArticleCategory, number>();

  // WHY: 文章分类侧栏必须来自真实内容，避免后续 Markdown 迁移后出现固定数字失真。
  articles.forEach((article) => {
    categoryCount.set(article.category, (categoryCount.get(article.category) ?? 0) + 1);
  });

  return [...categoryCount.entries()].map(([category, count]) => ({ category, count }));
};
