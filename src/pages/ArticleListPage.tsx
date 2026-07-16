import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '../components/Icons';
import { TagList } from '../components/TagList';
import { useAppContext } from '../layouts/AppLayout';
import { articleCategoryLabels, getArticleCategories, getArticlesByCategory, type ArticleCategoryFilter } from '../lib/articles';
import { getLocalizedArticles } from '../lib/localizedContent';
import { appRoutes, buildArticlePath } from '../lib/routes';
import type { ArticleCategory } from '../types/content';

const orderedCategories: ArticleCategory[] = ['learning', 'work', 'diary'];
const PAGE_SIZE = 10;

export default function ArticleListPage() {
  const { dictionary, language } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = (searchParams.get('category') ?? 'all') as ArticleCategoryFilter;
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const articles = getLocalizedArticles(language);
  const sortedArticles = [...articles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const filteredArticles = getArticlesByCategory(sortedArticles, selectedCategory);
  const articleCategories = getArticleCategories(articles);
  const latestArticles = sortedArticles.slice(0, 5);
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedArticles = filteredArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /** 切换分类时重置页码 */
  const setCategory = (category: ArticleCategoryFilter) => {
    if (category === 'all') {
      setSearchParams({});
      return;
    }
    setSearchParams({ category });
  };

  /** 切换分页并保留当前分类筛选 */
  const setPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    const params: Record<string, string> = {};

    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }

    if (nextPage > 1) {
      params.page = String(nextPage);
    }

    setSearchParams(params);
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
          {pagedArticles.map((article) => (
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

        {totalPages > 1 ? (
          <nav className="pagination" aria-label="Pagination">
            <button type="button" aria-label={dictionary.actions.previousPage} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button className={page === safePage ? 'active' : ''} type="button" key={page} onClick={() => setPage(page)}>
                {page}
              </button>
            ))}
            <button type="button" aria-label={dictionary.actions.nextPage} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <ChevronRightIcon />
            </button>
          </nav>
        ) : null}
      </section>

      <aside className="article-page-sidebar" aria-label="Article sidebar">
        <section className="side-panel">
          <h2>{dictionary.pages.articleCategories}</h2>
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
          <Link className="article-sidebar-link" to={appRoutes.articles}>
            {dictionary.pages.viewAllArticles}
            <ArrowRightIcon />
          </Link>
        </section>
      </aside>
    </div>
  );
}
