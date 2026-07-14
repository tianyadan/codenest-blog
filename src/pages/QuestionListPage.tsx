import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContentCard } from '../components/ContentCard';
import { TagList } from '../components/TagList';
import { questionBanks, questions } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { buildQuestionPath } from '../lib/routes';

export default function QuestionListPage() {
  const { dictionary } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBank = searchParams.get('bank') ?? 'all';

  const filteredQuestions = useMemo(() => {
    if (selectedBank === 'all') {
      return questions;
    }
    return questions.filter((question) => question.bankSlug === selectedBank);
  }, [selectedBank]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Question Bank</p>
        <h1>{dictionary.pages.allQuestions}</h1>
      </div>

      <div className="bank-filter" aria-label={dictionary.pages.questionBanks}>
        <button className={selectedBank === 'all' ? 'active' : ''} type="button" onClick={() => setSearchParams({})}>
          All
        </button>
        {questionBanks.map((bank) => (
          <button
            className={selectedBank === bank.slug ? 'active' : ''}
            type="button"
            onClick={() => setSearchParams({ bank: bank.slug })}
            key={bank.id}
          >
            {bank.name}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filteredQuestions.map((question) => (
          <ContentCard
            key={question.id}
            title={question.title}
            summary={question.description}
            href={buildQuestionPath(question.slug)}
            tags={question.tags}
            meta={`${dictionary.labels.difficulty}: ${question.difficulty}`}
            actionLabel={dictionary.actions.viewQuestion}
          />
        ))}
      </div>

      <div className="section-block">
        <h2>{dictionary.pages.questionBanks}</h2>
        <div className="bank-grid">
          {questionBanks.map((bank) => (
            <article className="bank-card" key={bank.id}>
              <h3>{bank.name}</h3>
              <p>{bank.description}</p>
              <TagList tags={bank.tags} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
