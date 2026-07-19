import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../components/Icons';
import { useAppContext } from '../layouts/AppLayout';
import { getLocalizedQuestionBanks, getLocalizedQuestions } from '../lib/localizedContent';
import { buildQuestionBankPath } from '../lib/routes';

/** 题库首页：只展示分类与题目数量。 */
export default function QuestionListPage() {
  const { dictionary, language } = useAppContext();
  const questions = getLocalizedQuestions(language);
  const questionBanks = getLocalizedQuestionBanks(language);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Question Bank</p>
        <h1>{dictionary.pages.questionBanks}</h1>
        <p className="page-intro">{dictionary.pages.questionBankIntro}</p>
      </div>

      <div className="bank-index-grid">
        {questionBanks.map((bank) => {
          const count = questions.filter((question) => question.bankSlug === bank.slug).length;

          return (
            <Link className="bank-index-card" to={buildQuestionBankPath(bank.slug)} key={bank.id}>
              <div className="bank-index-card-main">
                <h2>{bank.name}</h2>
                <p>
                  <strong>{count}</strong>
                  <span>{dictionary.labels.questionCount}</span>
                </p>
              </div>
              <span className="bank-index-card-action" aria-hidden="true">
                <ArrowRightIcon />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
