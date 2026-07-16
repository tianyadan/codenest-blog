import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';
import { MoonIcon, SunIcon } from '../components/Icons';
import { appRoutes } from '../lib/routes';
import type { Dictionary } from '../lib/i18n';
import type { Language, ThemeMode } from '../types/content';

export type AppOutletContext = {
  language: Language;
  dictionary: Dictionary;
  theme: ThemeMode;
  toggleLanguage: () => void;
  toggleTheme: () => void;
};

export const useAppContext = () => useOutletContext<AppOutletContext>();

type AppLayoutProps = {
  context: AppOutletContext;
};

export function AppLayout({ context }: AppLayoutProps) {
  const navigate = useNavigate();
  const { dictionary, language, theme, toggleLanguage, toggleTheme } = context;

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to={appRoutes.home} className="brand" aria-label="CodeNest home">
          <img className="brand-logo" src="/favicon-32x32.png" alt="" width={32} height={32} />
          <span>CodeNest</span>
        </NavLink>

        <nav className="main-nav" aria-label="Primary">
          <NavLink to={appRoutes.home}>{dictionary.nav.home}</NavLink>
          <NavLink to={appRoutes.articles}>{dictionary.nav.articles}</NavLink>
          <NavLink to={appRoutes.questions}>{dictionary.nav.questions}</NavLink>
          <NavLink to={appRoutes.tags}>{dictionary.nav.tags}</NavLink>
        </nav>

        <div className="header-actions">
          <SearchBox
            compact
            placeholder={dictionary.actions.searchPlaceholder}
            onSearch={(keyword) => navigate(`${appRoutes.search}?q=${encodeURIComponent(keyword)}`)}
          />
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={dictionary.actions.toggleTheme}>
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="icon-button" type="button" onClick={toggleLanguage} aria-label={dictionary.actions.switchLanguage}>
            {language === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </header>

      <main className="site-main">
        <Outlet context={context} />
      </main>
    </div>
  );
}
