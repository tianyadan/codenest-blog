import type { Language } from '../types/content';
import { articles, questionBanks, questions } from '../data/content';

/** 按当前语言过滤文章（严格隔离，不回退）。 */
export const getLocalizedArticles = (language: Language) =>
  articles.filter((item) => item.lang === language);

/** 按当前语言过滤题目。 */
export const getLocalizedQuestions = (language: Language) =>
  questions.filter((item) => item.lang === language);

/** 按当前语言过滤题库。 */
export const getLocalizedQuestionBanks = (language: Language) =>
  questionBanks.filter((item) => item.lang === language);

/** 按 slug + 语言查找文章。 */
export const findLocalizedArticle = (slug: string, language: Language) =>
  articles.find((item) => item.slug === slug && item.lang === language);

/** 按 slug + 语言查找题目。 */
export const findLocalizedQuestion = (slug: string, language: Language) =>
  questions.find((item) => item.slug === slug && item.lang === language);
