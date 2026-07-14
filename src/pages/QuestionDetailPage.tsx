import { Link, useParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TableOfContents } from '../components/TableOfContents';
import { TagList } from '../components/TagList';
import { questionBanks, questions } from '../data/content';
import { useAppContext } from '../layouts/AppLayout';
import { appRoutes } from '../lib/routes';
import { extractTableOfContents } from '../lib/toc';

export default function QuestionDetailPage() {
  const { slug = '' } = useParams();
  const { dictionary } = useAppContext();
  const decodedSlug = decodeURIComponent(slug);
  const question = questions.find((item) => item.slug === decodedSlug);
  const bank = questionBanks.find((item) => item.slug === question?.bankSlug);

  if (!question) {
    return (
      <div className="empty-state">
        <h1>{dictionary.pages.notFound}</h1>
        <Link to={appRoutes.questions}>{dictionary.pages.allQuestions}</Link>
      </div>
    );
  }

  const tocItems = extractTableOfContents(question.answer);

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
        <MarkdownRenderer markdown={question.answer} />
      </div>
      <TableOfContents title={dictionary.labels.toc} items={tocItems} />
    </div>
  );
}
