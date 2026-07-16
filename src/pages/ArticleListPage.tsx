import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '../components/Icons';
import { TagList } from '../components/TagList';
import { useAppContext } from '../layouts/AppLayout';
import { articleCategoryLabels, getArticleCategories, getArticlesByCategory, type ArticleCategoryFilter } from '../lib/articles';
import { getLocalizedArticles } from '../lib/localizedContent';
import { buildArticlePath } from '../lib/routes';
import type { ArticleCategory } from '../types/content';

const orderedCategories: ArticleCategory[] = ['learning', 'work', 'diary'];

export default function ArticleListPage() {
  const { dictionary, language } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = (searchParams.get('category') ?? 'all') as ArticleCategoryFilter;
  const articles = getLocalizedArticles(language);
  const sortedArticles = [...articles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const filteredArticles = getArticlesByCategory(sortedArticles, selectedCategory);
  const articleCategories = getArticleCategories(articles);
  const latestArticles = sortedArticles.slice(0, 5);

  const setCategory = (category: ArticleCategoryFilter) => {
    if (category === 'all') {
      setSearchParams({});
      return;
    }
    setSearchParams({ category });
  };

  return (
    <div className="article-page-layout">
      <section className="article-page-main">
        <header className="article-page-hero">
          <h1>{dictionary.labels.articles}</h1>
          <p>{dictionary.pages.articleIntro}</p>

          <nav className="article-tabs" aria-label={dictionary.labels.articles}>
            <button className={selectedCategory === 'all' ? 'active' : ''} type="button" onClick={() => setCategory('all')}>
              {dictionary.pages.all}
            </button>
            {orderedCategories.map((category) => (
              <button
                className={selectedCategory === category ? 'active' : ''}
                type="button"
                onClick={() => setCategory(category)}
                key={category}
              >
                {articleCategoryLabels[category][language]}
              </button>
            ))}
          </nav>
        </header>

        <div className="article-feed">
          {filteredArticles.map((article) => (
            <article className="article-feed-row" key={article.id}>
              <time className="article-feed-date" dateTime={article.updatedAt}>
                {article.updatedAt}
              </time>
              <div className="article-feed-body">
                <h2>
                  <Link to={buildArticlePath(article.slug)}>{article.title}</Link>
                </h2>
                <p>{article.summary}</p>
                <TagList tags={[articleCategoryLabels[article.category][language], ...article.tags]} />
              </div>
              <span className="article-feed-time">
                <ClockIcon />
                {article.readingMinutes} {dictionary.labels.readingMinutes}
              </span>
            </article>
          ))}
        </div>

        <nav className="pagination" aria-label="Pagination">
          <button type="button" aria-label="Previous page">
            <ChevronLeftIcon />
          </button>
          <button className="active" type="button">
            1
          </button>
          <button type="button">2</button>
          <button type="button" aria-label="Next page">
            <ChevronRightIcon />
          </button>
        </nav>
      </section>

      <aside className="article-page-sidebar" aria-label="Article sidebar">
        <section className="side-panel">
          <h2>文章分类</h2>
          <div className="article-category-list">
            {orderedCategories.map((category) => {
              const categoryCount = articleCategories.find((item) => item.category === category)?.count ?? 0;

              return (
                <button
                  className={selectedCategory === category ? 'active' : ''}
                  type="button"
                  onClick={() => setCategory(category)}
                  key={category}
                >
                  <span>{articleCategoryLabels[category][language]}</span>
                  <strong>{categoryCount}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="side-panel">
          <h2>{dictionary.pages.recentUpdates}</h2>
          <ul className="recent-list article-recent-list">
            {latestArticles.map((article) => (
              <li key={article.id}>
                <Link to={buildArticlePath(article.slug)}>{article.title}</Link>
                <time dateTime={article.updatedAt}>{article.updatedAt}</time>
              </li>
            ))}
          </ul>
          <Link className="article-sidebar-link" to="/文章">
            查看全部文章
            <ArrowRightIcon />
          </Link>
        </section>
      </aside>
    </div>
  );
}
