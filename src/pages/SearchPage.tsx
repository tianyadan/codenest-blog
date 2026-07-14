import { Link, useSearchParams } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { TagList } from '../components/TagList';
import { searchableContent } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes, buildArticlePath, buildQuestionPath } from '../lib/routes';
import { searchContent } from '../lib/search';

export default function SearchPage() {
  const { dictionary } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('q') ?? '';
  const results = searchContent(searchableContent, keyword);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Search</p>
        <h1>{dictionary.pages.globalSearch}</h1>
      </div>

      <SearchBox
        initialValue={keyword}
        placeholder={dictionary.actions.searchPlaceholder}
        onSearch={(nextKeyword) => setSearchParams({ q: nextKeyword })}
      />

      <div className="search-results">
        {results.length === 0 ? (
          <div className="empty-state">
            <p>{dictionary.pages.noResults}</p>
          </div>
        ) : (
          results.map((result) => {
            const href = result.item.type === 'article' ? buildArticlePath(result.item.slug) : buildQuestionPath(result.item.slug);

            return (
              <article className="search-result" key={result.item.id}>
                <p className="card-meta">{result.item.type === 'article' ? dictionary.labels.articles : dictionary.labels.questions}</p>
                <h2>
                  <Link to={href}>{result.item.title}</Link>
                </h2>
                <p>{result.item.summary}</p>
                <TagList tags={result.item.tags} />
              </article>
            );
          })
        )}
      </div>

      {!keyword ? (
        <p className="muted">
          {dictionary.nav.home}: <Link to={appRoutes.home}>CodeNest</Link>
        </p>
      ) : null}
    </section>
  );
}
