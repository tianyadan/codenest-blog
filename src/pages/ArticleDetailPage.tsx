import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { articles, loadArticleContent } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

export default function ArticleDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const article = articles.find((item) => item.slug === decodedSlug);
  const [content, setContent] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!article) {
      setContent(null);
      setLoadState('idle');
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    // WHY: 正文按 slug 懒加载，列表页不必打包全部 Markdown。
    loadArticleContent(article.slug)
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
  }, [article]);

  if (!article) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.articles}>{dictionary.pages.allArticles}</Link>
      </div>
    );
  }

  const tocItems = content ? extractTableOfContents(content) : [];

  return (
    <div className="detail-layout">
      <div className="detail-content">
        <p className="eyebrow">{article.author}</p>
        <h1>{article.title}</h1>
        <p className="detail-summary">{article.summary}</p>
        <div className="detail-meta">
          {dictionary.labels.updatedAt} {article.updatedAt} · {article.readingMinutes} {dictionary.labels.readingMinutes}
        </div>
        <TagList tags={article.tags} />
        {loadState === 'loading' || loadState === 'idle' ? <p className="muted">Loading…</p> : null}
        {loadState === 'error' ? <p className="muted">{dictionary.pages.notFound}</p> : null}
        {loadState === 'ready' && content ? <MarkdownRenderer markdown={content} /> : null}
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
