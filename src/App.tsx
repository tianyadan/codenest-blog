import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout, type AppOutletContext } from './layouts/AppLayout';
import { getDictionary, normalizeLanguage } from './lib/i18n';
import { appRoutes } from './lib/routes';
import { normalizeTheme, resolveNextTheme } from './lib/theme';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleListPage from './pages/ArticleListPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import QuestionListPage from './pages/QuestionListPage';
import SearchPage from './pages/SearchPage';
import TagsPage from './pages/TagsPage';
import type { Language, ThemeMode } from './types/content';

const languageStorageKey = 'codenest-language';
const themeStorageKey = 'codenest-theme';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => normalizeLanguage(localStorage.getItem(languageStorageKey)));
  const [theme, setTheme] = useState<ThemeMode>(() => normalizeTheme(localStorage.getItem(themeStorageKey)));

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const context = useMemo<AppOutletContext>(
    () => ({
      language,
      dictionary: getDictionary(language),
      theme,
      toggleLanguage: () => setLanguage((current) => (current === 'zh' ? 'en' : 'zh')),
      toggleTheme: () => setTheme((current) => resolveNextTheme(current))
    }),
    [language, theme]
  );

  return (
    <Routes>
      <Route element={<AppLayout context={context} />}>
        <Route index element={<HomePage />} />
        <Route path={appRoutes.articles.slice(1)} element={<ArticleListPage />} />
        <Route path={appRoutes.articleDetail.slice(1)} element={<ArticleDetailPage />} />
        <Route path={appRoutes.questions.slice(1)} element={<QuestionListPage />} />
        <Route path={appRoutes.questionDetail.slice(1)} element={<QuestionDetailPage />} />
        <Route path={appRoutes.tags.slice(1)} element={<TagsPage />} />
        <Route path={appRoutes.search.slice(1)} element={<SearchPage />} />
        <Route path="/articles" element={<Navigate to={appRoutes.articles} replace />} />
        <Route path="/questions" element={<Navigate to={appRoutes.questions} replace />} />
        <Route path="/search" element={<Navigate to={appRoutes.search} replace />} />
        <Route path="/tags" element={<Navigate to={appRoutes.tags} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
