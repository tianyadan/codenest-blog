import { Link, useSearchParams } from 'react-router-dom';
import { TagList } from '../components/TagList';
import { useAppContext } from '../layouts/AppLayout';
import { getLocalizedPrompts } from '../lib/localizedContent';
import {
  getPromptCategories,
  getPromptsByCategory,
  orderedPromptCategories,
  promptCategoryLabels,
  type PromptCategoryFilter
} from '../lib/prompts';
import { buildPromptPath } from '../lib/routes';

/** 提示词列表：左侧标题，右侧标签，风格贴近文章列表。 */
export default function PromptListPage() {
  const { dictionary, language } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = (searchParams.get('category') ?? 'all') as PromptCategoryFilter;
  const prompts = getLocalizedPrompts(language);
  const sortedPrompts = [...prompts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const filteredPrompts = getPromptsByCategory(sortedPrompts, selectedCategory);
  const promptCategories = getPromptCategories(prompts);

  /** 切换分类筛选。 */
  const setCategory = (category: PromptCategoryFilter) => {
    if (category === 'all') {
      setSearchParams({});
      return;
    }
    setSearchParams({ category });
  };

  return (
    <div className="article-page-layout">
      <section className="article-page-main">
        <header className="article-page-hero">
          <h1>{dictionary.labels.prompts}</h1>
          <p>{dictionary.pages.promptIntro}</p>

          <nav className="article-tabs" aria-label={dictionary.labels.prompts}>
            <button className={selectedCategory === 'all' ? 'active' : ''} type="button" onClick={() => setCategory('all')}>
              {dictionary.pages.all}
            </button>
            {orderedPromptCategories.map((category) => (
              <button
                className={selectedCategory === category ? 'active' : ''}
                type="button"
                onClick={() => setCategory(category)}
                key={category}
              >
                {promptCategoryLabels[category][language]}
              </button>
            ))}
          </nav>
        </header>

        {filteredPrompts.length === 0 ? (
          <div className="empty-state">
            <p>{dictionary.pages.emptyPrompts}</p>
          </div>
        ) : (
          <div className="prompt-feed">
            {filteredPrompts.map((prompt) => (
              <Link className="prompt-feed-row" to={buildPromptPath(prompt.slug)} key={prompt.id}>
                <div className="prompt-feed-main">
                  <h2>{prompt.title}</h2>
                  {prompt.summary ? <p>{prompt.summary}</p> : null}
                </div>
                <div className="prompt-feed-tags">
                  <TagList tags={[promptCategoryLabels[prompt.category][language], ...prompt.tags]} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <aside className="article-page-sidebar" aria-label="Prompt sidebar">
        <section className="side-panel">
          <h2>{dictionary.pages.promptCategories}</h2>
          <div className="article-category-list">
            {promptCategories.map(({ category, count }) => (
              <button
                className={selectedCategory === category ? 'active' : ''}
                type="button"
                onClick={() => setCategory(category)}
                key={category}
              >
                <span>{promptCategoryLabels[category][language]}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
