import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppLayout, type AppOutletContext } from './layouts/AppLayout';
import { getDictionary, normalizeLanguage } from './lib/i18n';
import { appRoutes, buildArticlePath, buildPromptPath, buildQuestionBankPath, buildQuestionPath } from './lib/routes';
import { normalizeTheme, resolveNextTheme } from './lib/theme';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleListPage from './pages/ArticleListPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PromptDetailPage from './pages/PromptDetailPage';
import PromptListPage from './pages/PromptListPage';
import QuestionBankPage from './pages/QuestionBankPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import QuestionListPage from './pages/QuestionListPage';
import SearchPage from './pages/SearchPage';
import TagsPage from './pages/TagsPage';
import type { Language, ThemeMode } from './types/content';

const languageStorageKey = 'codenest-language';
const themeStorageKey = 'codenest-theme';

/** 兼容旧中文文章详情路径。 */
function LegacyArticleRedirect() {
  const { slug = '' } = useParams();
  return <Navigate to={buildArticlePath(decodeURIComponent(slug))} replace />;
}

/** 兼容旧中文题库分类路径。 */
function LegacyQuestionBankRedirect() {
  const { bankSlug = '' } = useParams();
  return <Navigate to={buildQuestionBankPath(decodeURIComponent(bankSlug))} replace />;
}

/** 兼容旧中文题目详情路径。 */
function LegacyQuestionDetailRedirect() {
  const { bankSlug = '', slug = '' } = useParams();
  return <Navigate to={buildQuestionPath(decodeURIComponent(bankSlug), decodeURIComponent(slug))} replace />;
}

/** 兼容旧中文搜索路径，保留查询参数。 */
function LegacySearchRedirect() {
  const location = useLocation();
  return <Navigate to={`${appRoutes.search}${location.search}`} replace />;
}

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
        <Route path={appRoutes.questionBank.slice(1)} element={<QuestionBankPage />} />
        <Route path={appRoutes.questionDetail.slice(1)} element={<QuestionDetailPage />} />
        <Route path={appRoutes.prompts.slice(1)} element={<PromptListPage />} />
        <Route path={appRoutes.promptDetail.slice(1)} element={<PromptDetailPage />} />
        <Route path={appRoutes.tags.slice(1)} element={<TagsPage />} />
        <Route path={appRoutes.search.slice(1)} element={<SearchPage />} />

        {/* 旧工作总结里的提示词文章 → 提示词详情 */}
        <Route
          path="articles/schedule-busy-timeline-prompt"
          element={<Navigate to={buildPromptPath('busy-timeline-drawer')} replace />}
        />
        <Route
          path="文章/schedule-busy-timeline-prompt"
          element={<Navigate to={buildPromptPath('busy-timeline-drawer')} replace />}
        />

        {/* 旧中文路径 → 英文路径 */}
        <Route path="文章" element={<Navigate to={appRoutes.articles} replace />} />
        <Route path="文章/:slug" element={<LegacyArticleRedirect />} />
        <Route path="题库" element={<Navigate to={appRoutes.questions} replace />} />
        <Route path="题库/:bankSlug" element={<LegacyQuestionBankRedirect />} />
        <Route path="题库/:bankSlug/:slug" element={<LegacyQuestionDetailRedirect />} />
        <Route path="标签" element={<Navigate to={appRoutes.tags} replace />} />
        <Route path="搜索" element={<LegacySearchRedirect />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
