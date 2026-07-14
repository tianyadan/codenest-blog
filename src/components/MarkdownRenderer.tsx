import { ReactNode } from 'react';
import { slugifyHeading } from '../lib/toc';

type MarkdownRendererProps = {
  markdown: string;
};

const renderInlineText = (text: string) => text;

export function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  const headingCounts = new Map<string, number>();
  const lines = markdown.trim().split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {listItems.map((item) => (
          <li key={item}>{renderInlineText(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) {
      return;
    }
    nodes.push(
      <pre key={`code-${nodes.length}`}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      }
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const baseSlug = slugifyHeading(text);
      const currentCount = headingCounts.get(baseSlug) ?? 0;
      headingCounts.set(baseSlug, currentCount + 1);
      const id = level === 1 ? undefined : currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;

      if (level === 1) {
        nodes.push(<h1 key={text}>{text}</h1>);
      } else if (level === 2) {
        nodes.push(
          <h2 id={id} key={id}>
            {text}
          </h2>
        );
      } else {
        nodes.push(
          <h3 id={id} key={id}>
            {text}
          </h3>
        );
      }
      return;
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2).trim());
      return;
    }

    flushList();

    if (line.trim()) {
      nodes.push(<p key={`p-${nodes.length}`}>{renderInlineText(line.trim())}</p>);
    }
  });

  flushList();
  flushCode();

  return <article className="markdown-body">{nodes}</article>;
}
