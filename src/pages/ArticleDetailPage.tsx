import { Link, useParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { articles } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

export default function ArticleDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const article = articles.find((item) => item.slug === decodedSlug);

  if (!article) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.articles}>{dictionary.pages.allArticles}</Link>
      </div>
    );
  }

  const tocItems = extractTableOfContents(article.content);

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
        <MarkdownRenderer markdown={article.content} />
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
