import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getDictionary } from '../lib/i18n';
import HomePage from './HomePage';

/** 带上首页需要的语言上下文。 */
const renderHome = () =>
  render(
    <MemoryRouter>
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
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('HomePage', () => {
  it('lists recently published articles instead of pinned notes', () => {
    renderHome();

    const section = screen.getByRole('heading', { name: '最新文章' }).closest('section');
    expect(section).toBeTruthy();
    expect(section?.textContent).not.toContain('注解');
    expect(section?.textContent).toContain('TL-XDR3010');
  });

  it('shows only the four largest question banks and the heatmap after them', () => {
    renderHome();

    const bankSection = screen.getByRole('heading', { name: '题库分类' }).closest('section');
    expect(bankSection?.querySelectorAll('.bank-card-plain')).toHaveLength(4);

    const banks = screen.getByRole('heading', { name: '题库分类' });
    const heatmap = screen.getByRole('heading', { name: '文章更新' });
    expect(banks.compareDocumentPosition(heatmap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('grid', { name: /年更新/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
  });
});
