import type { TocItem } from '../types/content';

type TableOfContentsProps = {
  title: string;
  items: TocItem[];
};

export function TableOfContents({ title, items }: TableOfContentsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <aside className="toc" aria-label={title}>
      <p>{title}</p>
      <nav>
        {items.map((item) => (
          <a className={`toc-level-${item.level}`} href={`#${item.id}`} key={item.id}>
            {item.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
