export const appRoutes = {
  home: '/',
  articles: '/文章',
  articleDetail: '/文章/:slug',
  questions: '/题库',
  questionBank: '/题库/:bankSlug',
  questionDetail: '/题库/:bankSlug/:slug',
  tags: '/标签',
  search: '/搜索'
} as const;

const buildDetailPath = (basePath: string, slug: string) => {
  return `${basePath}/${encodeURIComponent(slug)}`;
};

export const buildArticlePath = (slug: string) => buildDetailPath(appRoutes.articles, slug);

/** 题库分类页路径：/题库/:bankSlug */
export const buildQuestionBankPath = (bankSlug: string) => buildDetailPath(appRoutes.questions, bankSlug);

/** 题目详情路径：/题库/:bankSlug/:slug */
export const buildQuestionPath = (bankSlug: string, slug: string) =>
  `${buildQuestionBankPath(bankSlug)}/${encodeURIComponent(slug)}`;
