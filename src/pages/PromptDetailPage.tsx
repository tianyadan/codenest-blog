import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { loadPromptContent } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { findLocalizedPrompt } from '../lib/localizedContent';
import { promptCategoryLabels } from '../lib/prompts';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

/** 提示词详情页。 */
export default function PromptDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary, language } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const prompt = findLocalizedPrompt(decodedSlug, language);
  const [content, setContent] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!prompt) {
      setContent(null);
      setLoadState('idle');
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    // WHY: 提示词正文按需懒加载，避免列表页打进全部 Markdown。
    loadPromptContent(prompt.slug, language)
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
  }, [prompt, language]);

  if (!prompt) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.prompts}>{dictionary.actions.backToPrompts}</Link>
      </div>
    );
  }

  const tocItems = content ? extractTableOfContents(content) : [];

  return (
    <div className="detail-layout">
      <div className="detail-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={appRoutes.prompts}>{dictionary.labels.prompts}</Link>
          <span aria-hidden="true">/</span>
          <span>{promptCategoryLabels[prompt.category][language]}</span>
        </nav>

        <p className="eyebrow">{prompt.author}</p>
        <h1>{prompt.title}</h1>
        <p className="detail-summary">{prompt.summary}</p>
        <div className="detail-meta">
          {dictionary.labels.updatedAt} {prompt.updatedAt}
        </div>
        <TagList tags={[promptCategoryLabels[prompt.category][language], ...prompt.tags]} />
        {loadState === 'loading' || loadState === 'idle' ? <p className="muted">Loading…</p> : null}
        {loadState === 'error' ? <p className="muted">{dictionary.pages.notFound}</p> : null}
        {loadState === 'ready' && content ? <MarkdownRenderer markdown={content} /> : null}
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
