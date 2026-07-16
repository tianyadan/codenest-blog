import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { loadQuestionAnswer, questionBanks, questions } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

export default function QuestionDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const question = questions.find((item) => item.slug === decodedSlug);
  const bank = questionBanks.find((item) => item.slug === question?.bankSlug);
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

    loadQuestionAnswer(question.slug)
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
  }, [question]);

  if (!question) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.questions}>{dictionary.pages.allQuestions}</Link>
      </div>
    );
  }

  const tocItems = answer ? extractTableOfContents(answer) : [];

  return (
    <div className="detail-layout">
      <div className="detail-content">
        <p className="eyebrow">{bank?.name ?? dictionary.pages.questionBanks}</p>
        <h1>{question.title}</h1>
        <p className="detail-summary">{question.description}</p>
        <div className="detail-meta">
          {dictionary.labels.difficulty}: {question.difficulty}
          {question.source ? ` · ${dictionary.labels.source}: ${question.source}` : ''}
        </div>
        <TagList tags={question.tags} />
        {loadState === 'loading' || loadState === 'idle' ? <p className="muted">Loading…</p> : null}
        {loadState === 'error' ? <p className="muted">{dictionary.pages.notFound}</p> : null}
        {loadState === 'ready' && answer ? <MarkdownRenderer markdown={answer} /> : null}
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
