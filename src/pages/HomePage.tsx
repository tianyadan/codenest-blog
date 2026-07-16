import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmailModal } from '../components/EmailModal';
import { ArrowRightIcon, CodeIcon, DatabaseIcon, GithubIcon, MailIcon } from '../components/Icons';
import { TagList } from '../components/TagList';
import { appRoutes, buildArticlePath } from '../lib/routes';
import { getLocalizedArticles, getLocalizedQuestionBanks, getLocalizedQuestions } from '../lib/localizedContent';
import { useAppContext } from '../layouts/AppLayout';

export default function HomePage() {
  const { dictionary, language } = useAppContext();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const articles = getLocalizedArticles(language);
  const questions = getLocalizedQuestions(language);
  const questionBanks = getLocalizedQuestionBanks(language);
  const topArticles = [...articles].sort((left, right) => (left.topOrder ?? 99) - (right.topOrder ?? 99)).slice(0, 3);
  const latestArticles = [...articles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4);

  return (
    <div className="home-layout">
      <div className="home-main">
        <section className="home-hero">
          <h1>{dictionary.pages.homeTitle}</h1>
          <p>{dictionary.pages.homeSubtitle}</p>

          <div className="home-stats" aria-label="Content statistics">
            <div>
              <strong>{articles.length}</strong>
              <span>{dictionary.labels.articles}</span>
            </div>
            <div>
              <strong>{questions.length}</strong>
              <span>{dictionary.labels.questions}</span>
            </div>
            <div>
              <strong>{questionBanks.length}</strong>
              <span>{dictionary.pages.questionBanks}</span>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-heading">
          <h2>{dictionary.pages.latestArticles}</h2>
            <Link to={appRoutes.articles}>
              {dictionary.pages.allArticles}
              <ArrowRightIcon />
            </Link>
          </div>

          <div className="article-list-plain">
            {topArticles.map((article) => (
              <article className="article-row" key={article.id}>
                <div>
                  <h3>
                    <Link to={buildArticlePath(article.slug)}>{article.title}</Link>
                  </h3>
                  <p>{article.summary}</p>
                  <TagList tags={article.tags} />
                </div>
                <div className="article-row-meta">
                  <time dateTime={article.updatedAt}>{article.updatedAt}</time>
                  <span>
                    {article.readingMinutes} {dictionary.labels.readingMinutes}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-heading">
          <h2>{dictionary.pages.questionBanks}</h2>
            <Link to={appRoutes.questions}>
              {dictionary.pages.allQuestions}
              <ArrowRightIcon />
            </Link>
          </div>

          <div className="bank-grid-plain">
            {questionBanks.map((bank) => (
              <Link className="bank-card-plain" to={`${appRoutes.questions}?bank=${bank.slug}`} key={bank.id}>
                <span className="bank-icon">{bank.slug === 'mysql' ? <DatabaseIcon /> : <CodeIcon />}</span>
                <span>
                  <strong>{bank.name}</strong>
                  <small>{bank.description}</small>
                  <em>{questions.filter((question) => question.bankSlug === bank.slug).length} questions</em>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="home-sidebar" aria-label="Home sidebar">
        <section className="side-panel about-panel">
          <h2>{dictionary.pages.aboutMe}</h2>
          <p>{dictionary.pages.aboutMeBio1}</p>
          <p>{dictionary.pages.aboutMeBio2}</p>
          <div className="social-links">
            <a href="https://github.com/tianyadan/codenest-blog/tree/main" target="_blank" rel="noreferrer" aria-label={dictionary.labels.github}>
              <GithubIcon />
            </a>
            <button type="button" className="social-link-button" aria-label={dictionary.labels.email} onClick={() => setEmailModalOpen(true)}>
              <MailIcon />
            </button>
          </div>
        </section>

        <section className="side-panel">
          <h2>{dictionary.pages.recentUpdates}</h2>
          <ul className="recent-list">
            {latestArticles.map((article) => (
              <li key={article.id}>
                <Link to={buildArticlePath(article.slug)}>{article.title}</Link>
                <time dateTime={article.updatedAt}>{article.updatedAt}</time>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <footer className="home-footer">
        <span>© 2026 CodeNest. All rights reserved.</span>
        <span>{dictionary.pages.footerTagline}</span>
      </footer>

      <EmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} dictionary={dictionary} />
    </div>
  );
}
