import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  isTableRowLine,
  isTableSeparatorLine,
  parseListItem,
  parseTableCells,
  tokenizeInline
} from '../lib/markdown';
import { slugifyHeading } from '../lib/toc';
import { CodeBlock } from './CodeBlock';

type MarkdownRendererProps = {
  markdown: string;
};

/** 渲染行内 Markdown：粗体、行内代码、内外链。 */
const renderInlineText = (text: string, keyPrefix: string): ReactNode[] =>
  tokenizeInline(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.type === 'bold') {
      return <strong key={key}>{token.value}</strong>;
    }

    if (token.type === 'code') {
      return <code key={key}>{token.value}</code>;
    }

    if (token.type === 'link') {
      // 站内路径走 Router，外链新窗口打开。
      if (token.href.startsWith('/')) {
        return (
          <Link className="markdown-link" key={key} to={token.href}>
            {token.text}
          </Link>
        );
      }

      return (
        <a className="markdown-link" href={token.href} key={key} rel="noreferrer" target="_blank">
          {token.text}
        </a>
      );
    }

    return <span key={key}>{token.value}</span>;
  });

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
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;
  let index = 0;

  /** 输出当前累积的列表。 */
  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }

    const ListTag = listType;
    nodes.push(
      <ListTag key={`list-${nodes.length}`}>
        {listItems.map((item, itemIndex) => (
          <li key={`${ListTag}-${itemIndex}`}>{renderInlineText(item, `li-${nodes.length}-${itemIndex}`)}</li>
        ))}
      </ListTag>
    );
    listType = null;
    listItems = [];
  };

  /** 输出当前累积的代码块。 */
  const flushCode = () => {
    if (codeLines.length === 0) {
      return;
    }
    nodes.push(<CodeBlock key={`code-${nodes.length}`} code={codeLines.join('\n')} />);
    codeLines = [];
  };

  /** 从当前行开始解析 GFM 表格；成功则推进 index。 */
  const tryConsumeTable = (startIndex: number) => {
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];
    if (!headerLine || !separatorLine || !isTableRowLine(headerLine) || !isTableSeparatorLine(separatorLine)) {
      return false;
    }

    const headers = parseTableCells(headerLine);
    const rows: string[][] = [];
    let cursor = startIndex + 2;

    while (cursor < lines.length && isTableRowLine(lines[cursor]) && !isTableSeparatorLine(lines[cursor])) {
      rows.push(parseTableCells(lines[cursor]));
      cursor += 1;
    }

    flushList();
    nodes.push(
      <div className="markdown-table-wrap" key={`table-${nodes.length}`}>
        <table>
          <thead>
            <tr>
              {headers.map((cell, cellIndex) => (
                <th key={`th-${cellIndex}`}>{renderInlineText(cell, `th-${nodes.length}-${cellIndex}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`tr-${rowIndex}`}>
                {headers.map((_, cellIndex) => (
                  <td key={`td-${rowIndex}-${cellIndex}`}>
                    {renderInlineText(row[cellIndex] ?? '', `td-${nodes.length}-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    index = cursor;
    return true;
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
      }
      inCodeBlock = !inCodeBlock;
      index += 1;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      index += 1;
      continue;
    }

    if (tryConsumeTable(index)) {
      continue;
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
        nodes.push(<h1 key={`h1-${nodes.length}`}>{renderInlineText(text, `h1-${nodes.length}`)}</h1>);
      } else if (level === 2) {
        nodes.push(
          <h2 id={id} key={id}>
            {renderInlineText(text, `h2-${id}`)}
          </h2>
        );
      } else {
        nodes.push(
          <h3 id={id} key={id}>
            {renderInlineText(text, `h3-${id}`)}
          </h3>
        );
      }
      index += 1;
      continue;
    }

    const listItem = parseListItem(line);
    if (listItem) {
      if (listType && listType !== listItem.type) {
        flushList();
      }
      listType = listItem.type;
      listItems.push(listItem.text);
      index += 1;
      continue;
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
      index += 1;
      continue;
    }

    if (line.trim()) {
      nodes.push(<p key={`p-${nodes.length}`}>{renderInlineText(line.trim(), `p-${nodes.length}`)}</p>);
    }

    index += 1;
  }

  flushList();
  flushCode();

  return <article className="markdown-body">{nodes}</article>;
}
