import { Link } from 'react-router-dom';
import { TagList } from './TagList';

type ContentCardProps = {
  title: string;
  summary: string;
  href: string;
  tags: string[];
  meta?: string;
  actionLabel: string;
};

export function ContentCard({ title, summary, href, tags, meta, actionLabel }: ContentCardProps) {
  return (
    <article className="content-card">
      {meta ? <p className="card-meta">{meta}</p> : null}
      <h3>
        <Link to={href}>{title}</Link>
      </h3>
      <p>{summary}</p>
      <TagList tags={tags} />
      <Link className="text-link" to={href}>
        {actionLabel}
      </Link>
    </article>
  );
}
