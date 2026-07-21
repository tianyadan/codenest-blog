/**
 * 轻量 Markdown 辅助：行内标记拆分、表格行识别。
 * 供 MarkdownRenderer 使用，便于单测覆盖。
 */

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; text: string; href: string };

const INLINE_TOKEN_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

/** 将一行文本拆成行内 token（粗体 / 行内代码 / 链接 / 纯文本）。 */
export const tokenizeInline = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push({ type: 'code', value: token.slice(1, -1) });
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: 'link', text: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ type: 'text', value: token });
      }
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
};

/** 判断是否为 Markdown 表格行（以 | 开头）。 */
export const isTableRowLine = (line: string) => {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|', 1);
};

/** 判断是否为表格分隔行，例如 `| --- | --- |`。 */
export const isTableSeparatorLine = (line: string) =>
  /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());

/** 拆分表格单元格，去掉首尾管道符。 */
export const parseTableCells = (line: string) => {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
};

/** 解析有序 / 无序列表项；非列表行返回 null。 */
export const parseListItem = (line: string): { type: 'ul' | 'ol'; text: string } | null => {
  const unordered = line.match(/^[-*]\s+(.+)$/);
  if (unordered) {
    return { type: 'ul', text: unordered[1].trim() };
  }

  const ordered = line.match(/^\d+\.\s+(.+)$/);
  if (ordered) {
    return { type: 'ol', text: ordered[1].trim() };
  }

  return null;
};
