import { Link } from 'react-router-dom';
import { ArrowRightIcon, CodeIcon, DatabaseIcon, GithubIcon, MailIcon } from '../components/Icons';
import { TagList } from '../components/TagList';
import { articles, questionBanks, questions } from '../data/content';
import { appRoutes, buildArticlePath } from '../lib/routes';
import { useAppContext } from '../layouts/AppLayout';

export default function HomePage() {
  const { dictionary } = useAppContext();
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
          <p>热爱编程，喜欢研究技术与业务结合的可能性。</p>
          <p>专注于 Java 后端开发，沉淀知识，分享成长。</p>
          <div className="social-links">
            <a href="https://github.com" aria-label="GitHub">
              <GithubIcon />
            </a>
            <a href="mailto:hello@codenest.dev" aria-label="Email">
              <MailIcon />
            </a>
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
        <span>专注技术成长 · 持续输出价值</span>
      </footer>
    </div>
  );
}
