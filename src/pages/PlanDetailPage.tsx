import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { loadPlanContent } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { findLocalizedPlan } from '../lib/localizedContent';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

/** 计划详情页。 */
export default function PlanDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary, language } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const plan = findLocalizedPlan(decodedSlug, language);
  const [content, setContent] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!plan) {
      setContent(null);
      setLoadState('idle');
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    // WHY: 计划正文按需懒加载，列表页不必打包全部 Markdown。
    loadPlanContent(plan.slug, language)
      .then((markdown) => {
        if (cancelled) return;
        if (markdown === null) {
          setLoadState('error');
          return;
        }
        setContent(markdown);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [plan, language]);

  if (!plan) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.plans}>{dictionary.actions.backToPlans}</Link>
      </div>
    );
  }

  const tocItems = content ? extractTableOfContents(content) : [];

  return (
    <div className="detail-layout">
      <div className="detail-content">
        <p className="eyebrow">{plan.author}</p>
        <h1>{plan.title}</h1>
        <p className="detail-summary">{plan.summary}</p>
        <div className="detail-meta">
          {dictionary.labels.updatedAt} {plan.updatedAt} · {plan.readingMinutes} {dictionary.labels.readingMinutes}
        </div>
        {loadState === 'loading' || loadState === 'idle' ? <p className="muted">Loading…</p> : null}
        {loadState === 'error' ? <p className="muted">{dictionary.pages.notFound}</p> : null}
        {loadState === 'ready' && content ? <MarkdownRenderer markdown={content} /> : null}
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
