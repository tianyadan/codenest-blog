import { describe, expect, it } from 'vitest';
import {
  isTableRowLine,
  isTableSeparatorLine,
  parseListItem,
  parseTableCells,
  tokenizeInline
} from './markdown';

describe('tokenizeInline', () => {
  it('splits bold, inline code and links', () => {
    expect(
      tokenizeInline('见 [文章](/articles/demo) 与 `shareNativeConnection`，以及 **根因**。')
    ).toEqual([
      { type: 'text', value: '见 ' },
      { type: 'link', text: '文章', href: '/articles/demo' },
      { type: 'text', value: ' 与 ' },
      { type: 'code', value: 'shareNativeConnection' },
      { type: 'text', value: '，以及 ' },
      { type: 'bold', value: '根因' },
      { type: 'text', value: '。' }
    ]);
  });
});

describe('table helpers', () => {
  it('detects table rows and separators', () => {
    expect(isTableRowLine('| 方向 | 仓库 |')).toBe(true);
    expect(isTableSeparatorLine('|------|------|')).toBe(true);
    expect(isTableSeparatorLine('| --- | :---: | ---: |')).toBe(true);
    expect(isTableRowLine('普通段落')).toBe(false);
  });

  it('parses table cells', () => {
    expect(parseTableCells('| Java / Spring | `spring-boot` |')).toEqual(['Java / Spring', '`spring-boot`']);
  });
});

describe('parseListItem', () => {
  it('parses ordered and unordered list items', () => {
    expect(parseListItem('- 标注来源')).toEqual({ type: 'ul', text: '标注来源' });
    expect(parseListItem('1. 现场')).toEqual({ type: 'ol', text: '现场' });
    expect(parseListItem('普通段落')).toBeNull();
  });
});
