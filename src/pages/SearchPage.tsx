import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LatestActivityTicker } from '../components/LatestActivityTicker';
import { SearchBox } from '../components/SearchBox';
import { loadSearchableContent } from '../data/searchCorpus';
import { useAppContext } from '../layouts/AppLayout';
import {
  getLocalizedArticles,
  getLocalizedPrompts,
  getLocalizedQuestions
} from '../lib/localizedContent';
import { appRoutes, buildArticlePath, buildPlanPath, buildPromptPath, buildQuestionPath } from '../lib/routes';
import { searchContent } from '../lib/search';
import { buildLatestActivity } from '../lib/searchActivity';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import type { SearchableContent } from '../types/content';

/** 根据内容类型拼详情路径。 */
const resolveSearchHref = (item: SearchableContent) => {
  if (item.type === 'article') {
    return buildArticlePath(item.slug);
  }
  if (item.type === 'plan') {
    return buildPlanPath(item.slug);
  }
  if (item.type === 'prompt') {
    return buildPromptPath(item.slug);
  }
  if (item.bankSlug) {
    return buildQuestionPath(item.bankSlug, item.slug);
  }
  return appRoutes.questions;
};

/** 搜索结果 / 动态类型文案。 */
const resolveTypeLabel = (
  type: SearchableContent['type'] | 'article' | 'question' | 'prompt',
  dictionary: ReturnType<typeof useAppContext>['dictionary']
) => {
  if (type === 'article') return dictionary.labels.articles;
  if (type === 'plan') return dictionary.labels.plans;
  if (type === 'prompt') return dictionary.labels.prompts;
  return dictionary.labels.questions;
};

export default function SearchPage() {
  const { dictionary, language } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') ?? '';
  const [keyword, setKeyword] = useState(queryFromUrl);
  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const [corpus, setCorpus] = useState<SearchableContent[] | null>(null);
  const skipUrlSync = useRef(false);

  const articles = getLocalizedArticles(language);
  const prompts = getLocalizedPrompts(language);
  const questions = getLocalizedQuestions(language);
  const latestActivity = useMemo(
    () => buildLatestActivity(articles, prompts, questions),
    [articles, prompts, questions]
  );

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

  // 自己写回 URL 时不要再把输入框重置成旧值。
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    setKeyword(queryFromUrl);
  }, [queryFromUrl]);

  // 防抖后的关键字写回地址栏，方便分享。
  useEffect(() => {
    const next = debouncedKeyword.trim();
    if (next === queryFromUrl.trim()) {
      return;
    }
    skipUrlSync.current = true;
    setSearchParams(next ? { q: next } : {}, { replace: true });
  }, [debouncedKeyword, queryFromUrl, setSearchParams]);

  const results = corpus ? searchContent(corpus, debouncedKeyword, 10) : [];
  const showEmpty = Boolean(debouncedKeyword.trim()) && corpus !== null && results.length === 0;

  return (
    <section className="search-stage">
      <LatestActivityTicker
        items={latestActivity}
        language={language}
        typeLabel={(type) => resolveTypeLabel(type, dictionary)}
      />

      <div className="search-stage-box">
        <SearchBox
          autoFocus
          initialValue={keyword}
          placeholder={dictionary.actions.searchPlaceholder}
          onQueryChange={setKeyword}
          onSearch={(nextKeyword) => setKeyword(nextKeyword)}
        />
      </div>

      <div className="search-stage-results">
        {!corpus && debouncedKeyword.trim() ? <p className="muted">Loading…</p> : null}

        {results.map((result) => {
          const href = resolveSearchHref(result.item);

          return (
            <Link className="search-hit" to={href} key={result.item.id}>
              <span className="search-hit-type">{resolveTypeLabel(result.item.type, dictionary)}</span>
              <span className="search-hit-title">{result.item.title}</span>
              {result.item.summary ? <span className="search-hit-summary">{result.item.summary}</span> : null}
            </Link>
          );
        })}

        {showEmpty ? <p className="muted search-stage-empty">{dictionary.pages.noResults}</p> : null}
      </div>
    </section>
  );
}
