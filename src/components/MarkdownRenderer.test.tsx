import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

/** 在 Router 内渲染 Markdown，便于断言站内链接。 */
const renderMarkdown = (markdown: string) =>
  render(
    <MemoryRouter>
      <MarkdownRenderer markdown={markdown} />
    </MemoryRouter>
  );

describe('MarkdownRenderer', () => {
  it('renders GFM tables with inline code inside cells', () => {
    renderMarkdown(`
| 方向 | 推荐仓库 |
|------|----------|
| Redis 客户端 | \`redis/lettuce\` |
`);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '方向' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Redis 客户端' })).toBeInTheDocument();
    expect(screen.getByText('redis/lettuce').tagName).toBe('CODE');
  });

  it('renders markdown links instead of raw syntax', () => {
    renderMarkdown(`
- [查 Redis keyA 却返回 keyB](/articles/redis-shared-connection-wrong-value)
`);

    const link = screen.getByRole('link', { name: '查 Redis keyA 却返回 keyB' });
    expect(link).toHaveAttribute('href', '/articles/redis-shared-connection-wrong-value');
    expect(screen.queryByText(/\]\(\/articles\//)).not.toBeInTheDocument();
  });

  it('renders ordered lists and bold text', () => {
    renderMarkdown(`
1. **现场**：说明现象
2. **根因**：落到机制
`);

    expect(screen.getByText('现场').tagName).toBe('STRONG');
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
