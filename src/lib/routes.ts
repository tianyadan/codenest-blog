export const appRoutes = {
  home: '/',
  articles: '/文章',
  articleDetail: '/文章/:slug',
  questions: '/题库',
  questionDetail: '/题库/:slug',
  tags: '/标签',
  search: '/搜索'
} as const;

const buildDetailPath = (basePath: string, slug: string) => {
  return `${basePath}/${encodeURIComponent(slug)}`;
};

export const buildArticlePath = (slug: string) => buildDetailPath(appRoutes.articles, slug);

export const buildQuestionPath = (slug: string) => buildDetailPath(appRoutes.questions, slug);
