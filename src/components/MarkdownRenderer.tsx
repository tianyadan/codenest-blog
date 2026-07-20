import { type ReactNode } from 'react';
import { slugifyHeading } from '../lib/toc';
import { CodeBlock } from './CodeBlock';

type MarkdownRendererProps = {
  markdown: string;
};

const renderInlineText = (text: string) => text;

/** 解析独占一行的 Markdown 图片：![alt](src "optional title")。 */
const parseMarkdownImage = (line: string) => {
  const matched = line.trim().match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/);
  if (!matched) {
    return null;
  }

  return {
    alt: matched[1] || '',
    src: matched[2],
    title: matched[3]
  };
};

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
    nodes.push(<CodeBlock key={`code-${nodes.length}`} code={codeLines.join('\n')} />);
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

    const image = parseMarkdownImage(line);
    if (image) {
      nodes.push(
        <figure className="markdown-image" key={`img-${nodes.length}`}>
          <img src={image.src} alt={image.alt} title={image.title} loading="lazy" />
          {image.alt ? <figcaption>{image.alt}</figcaption> : null}
        </figure>
      );
      return;
    }

    if (line.trim()) {
      nodes.push(<p key={`p-${nodes.length}`}>{renderInlineText(line.trim())}</p>);
    }
  });

  flushList();
  flushCode();

  return <article className="markdown-body">{nodes}</article>;
}
