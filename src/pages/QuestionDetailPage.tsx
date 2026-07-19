import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { loadQuestionAnswer } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { findLocalizedQuestion, findLocalizedQuestionBank } from '../lib/localizedContent';
import { appRoutes, buildQuestionBankPath, buildQuestionPath } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

/** 题目详情页：分类 → 题目列表 → 本题。 */
export default function QuestionDetailPage() {
  const { bankSlug = '', slug = '' } = useParams();
  const { dictionary, language } = useAppContext();
  const decodedBankSlug = decodeURIComponent(bankSlug);
  const decodedSlug = decodeURIComponent(slug);
  const question = findLocalizedQuestion(decodedSlug, language);
  const bank = findLocalizedQuestionBank(decodedBankSlug, language);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!question) {
      setAnswer(null);
      setLoadState('idle');
      return;
    }

    let cancelled = false;
    setLoadState('loading');

    loadQuestionAnswer(question.slug, language)
      .then((markdown) => {
        if (cancelled) return;
        if (markdown === null) {
          setLoadState('error');
          return;
        }
        setAnswer(markdown);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [question, language]);

  // 题库路径与题目归属不一致时，纠正到正确分类路径。
  if (question && question.bankSlug !== decodedBankSlug) {
    return <Navigate to={buildQuestionPath(question.bankSlug, question.slug)} replace />;
  }

  if (!question || !bank) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.questions}>{dictionary.actions.backToBanks}</Link>
      </div>
    );
  }

  const tocItems = answer ? extractTableOfContents(answer) : [];

  return (
    <div className="detail-layout">
      <div className="detail-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={appRoutes.questions}>{dictionary.pages.questionBanks}</Link>
          <span aria-hidden="true">/</span>
          <Link to={buildQuestionBankPath(bank.slug)}>{bank.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{question.title}</span>
        </nav>

        <p className="eyebrow">{bank.name}</p>
        <h1>{question.title}</h1>
        <p className="detail-summary">{question.description}</p>
        <div className="detail-meta">
          {dictionary.labels.difficulty}: {question.difficulty}
          {question.source ? ` · ${dictionary.labels.source}: ${question.source}` : ''}
        </div>
        <TagList tags={question.tags} />
        <p className="detail-back-links">
          <Link className="text-link" to={buildQuestionBankPath(bank.slug)}>
            {dictionary.actions.backToQuestions}
          </Link>
        </p>
        {loadState === 'loading' || loadState === 'idle' ? <p className="muted">Loading…</p> : null}
        {loadState === 'error' ? <p className="muted">{dictionary.pages.notFound}</p> : null}
        {loadState === 'ready' && answer ? <MarkdownRenderer markdown={answer} /> : null}
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
