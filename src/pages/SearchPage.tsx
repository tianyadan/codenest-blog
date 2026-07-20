import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SearchBox } from '../components/SearchBox';
import { TagList } from '../components/TagList';
import { loadSearchableContent } from '../data/searchCorpus';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes, buildArticlePath, buildPromptPath, buildQuestionPath } from '../lib/routes';
import { searchContent } from '../lib/search';
import type { SearchableContent } from '../types/content';

/** 根据内容类型拼详情路径。 */
const resolveSearchHref = (item: SearchableContent) => {
  if (item.type === 'article') {
    return buildArticlePath(item.slug);
  }
  if (item.type === 'prompt') {
    return buildPromptPath(item.slug);
  }
  if (item.bankSlug) {
    return buildQuestionPath(item.bankSlug, item.slug);
  }
  return appRoutes.questions;
};

/** 搜索结果类型文案。 */
const resolveTypeLabel = (type: SearchableContent['type'], dictionary: ReturnType<typeof useAppContext>['dictionary']) => {
  if (type === 'article') return dictionary.labels.articles;
  if (type === 'prompt') return dictionary.labels.prompts;
  return dictionary.labels.questions;
};

export default function SearchPage() {
  const { dictionary, language } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('q') ?? '';
  const [corpus, setCorpus] = useState<SearchableContent[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // WHY: 搜索语料含正文，单独异步加载，并按语言严格隔离。
    loadSearchableContent(language).then((items) => {
      if (!cancelled) setCorpus(items);
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const results = corpus ? searchContent(corpus, keyword) : [];

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
        {!corpus ? (
          <p className="muted">Loading…</p>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <p>{dictionary.pages.noResults}</p>
          </div>
        ) : (
          results.map((result) => {
            const href = resolveSearchHref(result.item);

            return (
              <article className="search-result" key={result.item.id}>
                <p className="card-meta">{resolveTypeLabel(result.item.type, dictionary)}</p>
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
