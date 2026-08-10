import { Link } from 'react-router-dom';
import { ClockIcon } from '../components/Icons';
import { useAppContext } from '../layouts/AppLayout';
import { getLocalizedPlans } from '../lib/localizedContent';
import { buildPlanPath } from '../lib/routes';

/** 计划列表：与文章同级，不做分类与标签筛选。 */
export default function PlanListPage() {
  const { dictionary, language } = useAppContext();
  const plans = getLocalizedPlans(language);
  const sortedPlans = [...plans].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return (
    <div className="article-page-layout">
      <section className="article-page-main">
        <header className="article-page-hero">
          <h1>{dictionary.labels.plans}</h1>
          <p>{dictionary.pages.planIntro}</p>
        </header>

        {sortedPlans.length === 0 ? (
          <div className="empty-state">
            <p>{dictionary.pages.emptyPlans}</p>
          </div>
        ) : (
          <div className="article-feed">
            {sortedPlans.map((plan) => (
              <article className="article-feed-row" key={plan.id}>
                <time className="article-feed-date" dateTime={plan.updatedAt}>
                  {plan.updatedAt}
                </time>
                <div className="article-feed-body">
                  <h2>
                    <Link to={buildPlanPath(plan.slug)}>{plan.title}</Link>
                  </h2>
                  {plan.summary ? <p>{plan.summary}</p> : null}
                </div>
                <span className="article-feed-time">
                  <ClockIcon />
                  {plan.readingMinutes} {dictionary.labels.readingMinutes}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
