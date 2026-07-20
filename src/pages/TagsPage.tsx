import { Link } from 'react-router-dom';
import { useAppContext } from '../layouts/AppLayout';
import { getLocalizedArticles, getLocalizedPrompts, getLocalizedQuestions } from '../lib/localizedContent';
import { appRoutes } from '../lib/routes';
import type { Language } from '../types/content';

/** 汇总当前语言下的标签出现次数。 */
const collectTags = (language: Language) => {
  const articles = getLocalizedArticles(language);
  const prompts = getLocalizedPrompts(language);
  const questions = getLocalizedQuestions(language);
  const tagCounter = new Map<string, number>();

  [
    ...articles.flatMap((article) => article.tags),
    ...prompts.flatMap((prompt) => prompt.tags),
    ...questions.flatMap((question) => question.tags)
  ].forEach((tag) => {
    tagCounter.set(tag, (tagCounter.get(tag) ?? 0) + 1);
  });

  return [...tagCounter.entries()].sort((left, right) => left[0].localeCompare(right[0]));
};

export default function TagsPage() {
  const { dictionary, language } = useAppContext();
  const tags = collectTags(language);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Tags</p>
        <h1>{dictionary.labels.tags}</h1>
      </div>
      <div className="tag-page-grid">
        {tags.map(([tag, count]) => (
          <Link className="tag-page-item" to={`${appRoutes.search}?q=${encodeURIComponent(tag)}`} key={tag}>
            <span>{tag}</span>
            <strong>{count}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
