import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getDictionary } from '../lib/i18n';
import SearchPage from './SearchPage';

vi.mock('../data/searchCorpus', () => ({
  loadSearchableContent: async () => [
    {
      id: 'article-1',
      lang: 'zh',
      type: 'article',
      slug: 'redis-note',
      title: 'Redis 缓存笔记',
      summary: '讲缓存',
      tags: ['Redis'],
      body: 'Redis 实践'
    },
    {
      id: 'prompt-1',
      lang: 'zh',
      type: 'prompt',
      slug: 'ops-runbook',
      title: '运维 Runbook',
      summary: '排障',
      tags: ['ops'],
      body: '故障排查'
    }
  ]
}));

/** 带上搜索页需要的语言上下文。 */
const renderSearch = (route = '/search') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          element={
            <Outlet
              context={{
                language: 'zh',
                dictionary: getDictionary('zh'),
                theme: 'light',
                toggleLanguage: () => undefined,
                toggleTheme: () => undefined
              }}
            />
          }
        >
          <Route path="/search" element={<SearchPage />} />
          <Route path="/articles/:slug" element={<div>article detail</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('SearchPage', () => {
  it('shows a scrolling ticker of latest activity above the search box', async () => {
    renderSearch();

    expect(screen.getByLabelText('最新动态')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('lists clickable matches under the search box', async () => {
    renderSearch('/search?q=Redis');

    await waitFor(() => {
      const hit = screen.getByRole('link', { name: /Redis 缓存笔记/ });
      expect(hit).toHaveAttribute('href', '/articles/redis-note');
    });
  });

  it('updates the input when typing', () => {
    renderSearch();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'MySQL' } });
    expect(screen.getByRole('searchbox')).toHaveValue('MySQL');
  });
});
