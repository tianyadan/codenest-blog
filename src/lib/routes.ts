export const appRoutes = {
  home: '/',
  articles: '/articles',
  articleDetail: '/articles/:slug',
  questions: '/questions',
  questionBank: '/questions/:bankSlug',
  questionDetail: '/questions/:bankSlug/:slug',
  tags: '/tags',
  search: '/search'
} as const;

const buildDetailPath = (basePath: string, slug: string) => {
  return `${basePath}/${encodeURIComponent(slug)}`;
};

export const buildArticlePath = (slug: string) => buildDetailPath(appRoutes.articles, slug);

/** 题库分类页路径：/questions/:bankSlug */
export const buildQuestionBankPath = (bankSlug: string) => buildDetailPath(appRoutes.questions, bankSlug);

/** 题目详情路径：/questions/:bankSlug/:slug */
export const buildQuestionPath = (bankSlug: string, slug: string) =>
  `${buildQuestionBankPath(bankSlug)}/${encodeURIComponent(slug)}`;
