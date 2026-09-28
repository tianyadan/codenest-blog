import { buildArticlePath, buildPromptPath, buildQuestionPath } from './routes';

export type ActivityItem = {
  id: string;
  type: 'article' | 'question' | 'prompt';
  title: string;
  href: string;
  date: string;
};

type ActivitySource = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
};

type QuestionSource = {
  id: string;
  slug: string;
  bankSlug: string;
  title: string;
};

/** 把文章、提示词、题目收成可跳转的最新动态，按发布时间倒序，并穿插部分题目。 */
export const buildLatestActivity = (
  articles: ActivitySource[],
  prompts: ActivitySource[],
  questions: QuestionSource[],
  limit = 18
): ActivityItem[] => {
  const dated: ActivityItem[] = [
    ...articles.map((article) => ({
      id: article.id,
      type: 'article' as const,
      title: article.title,
      href: buildArticlePath(article.slug),
      date: article.createdAt
    })),
    ...prompts.map((prompt) => ({
      id: prompt.id,
      type: 'prompt' as const,
      title: prompt.title,
      href: buildPromptPath(prompt.slug),
      date: prompt.createdAt
    }))
  ].sort((left, right) => right.date.localeCompare(left.date));

  const questionItems: ActivityItem[] = questions.slice(0, Math.max(6, Math.ceil(limit / 3))).map((question) => ({
    id: question.id,
    type: 'question',
    title: question.title,
    href: buildQuestionPath(question.bankSlug, question.slug),
    date: ''
  }));

  const mixed: ActivityItem[] = [];
  let datedIndex = 0;
  let questionIndex = 0;

  while (mixed.length < limit && (datedIndex < dated.length || questionIndex < questionItems.length)) {
    const shouldInsertQuestion =
      questionIndex < questionItems.length && ((mixed.length > 0 && mixed.length % 3 === 2) || datedIndex >= dated.length);

    if (shouldInsertQuestion) {
      mixed.push(questionItems[questionIndex]);
      questionIndex += 1;
      continue;
    }

    if (datedIndex < dated.length) {
      mixed.push(dated[datedIndex]);
      datedIndex += 1;
    }
  }

  return mixed;
};
