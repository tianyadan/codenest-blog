import { Link, Navigate, useParams } from 'react-router-dom';
import { ContentCard } from '../components/ContentCard';
import { useAppContext } from '../layouts/AppLayout';
import {
  findLocalizedQuestion,
  findLocalizedQuestionBank,
  getQuestionsByBank
} from '../lib/localizedContent';
import { appRoutes, buildQuestionPath } from '../lib/routes';

/** 单个题库的题目列表页。 */
export default function QuestionBankPage() {
  const { bankSlug = '' } = useParams();
  const { dictionary, language } = useAppContext();
  const decodedBankSlug = decodeURIComponent(bankSlug);
  const bank = findLocalizedQuestionBank(decodedBankSlug, language);
  const bankQuestions = getQuestionsByBank(decodedBankSlug, language);

  // 兼容旧路径 /题库/:slug（曾直接指向题目详情）。
  if (!bank) {
    const legacyQuestion = findLocalizedQuestion(decodedBankSlug, language);
    if (legacyQuestion) {
      return <Navigate to={buildQuestionPath(legacyQuestion.bankSlug, legacyQuestion.slug)} replace />;
    }

    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.questions}>{dictionary.actions.backToBanks}</Link>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to={appRoutes.questions}>{dictionary.pages.questionBanks}</Link>
        <span aria-hidden="true">/</span>
        <span>{bank.name}</span>
      </nav>

      <div className="page-heading">
        <p className="eyebrow">Question Bank</p>
        <h1>{bank.name}</h1>
        <p className="page-intro">
          {bankQuestions.length} {dictionary.labels.questionCount}
          {bank.description ? ` · ${bank.description}` : ''}
        </p>
      </div>

      {bankQuestions.length === 0 ? (
        <div className="empty-state">
          <p>{dictionary.pages.emptyBank}</p>
          <Link to={appRoutes.questions}>{dictionary.actions.backToBanks}</Link>
        </div>
      ) : (
        <div className="card-grid">
          {bankQuestions.map((question) => (
            <ContentCard
              key={question.id}
              title={question.title}
              summary={question.description}
              href={buildQuestionPath(question.bankSlug, question.slug)}
              tags={question.tags}
              meta={`${dictionary.labels.difficulty}: ${question.difficulty}`}
              actionLabel={dictionary.actions.viewQuestion}
            />
          ))}
        </div>
      )}
    </section>
  );
}
