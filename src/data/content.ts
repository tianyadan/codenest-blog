import { articleMetas, questionBanks, questionMetas } from './generated/content-index';
import { parseFrontmatter } from '../lib/frontmatter';
import type { Article, QuestionItem } from '../types/content';

export type { ArticleMeta, QuestionMeta } from './generated/content-index';

/** 列表/首页只用元数据，避免把全部正文打进首包。 */
export const articles = articleMetas;
export const questions = questionMetas;
export { questionBanks };

/** Vite 按文件拆 chunk，详情页点击后再加载对应 md。 */
const markdownLoaders = import.meta.glob(
  ['../../content/articles/**/*.md', '../../content/questions/**/*.md'],
  {
    query: '?raw',
    import: 'default',
    eager: false
  }
) as Record<string, () => Promise<string>>;

/** 用生成索引里的相对路径对齐 glob key。 */
const resolveLoader = (relativeFile: string) => {
  const normalized = relativeFile.replace(/\\/g, '/');
  const matched = Object.entries(markdownLoaders).find(([key]) => {
    const posixKey = key.replace(/\\/g, '/');
    return posixKey.endsWith(`/${normalized}`) || posixKey.endsWith(normalized) || posixKey.includes(`/${normalized}`);
  });
  return matched?.[1];
};

/** 加载文章正文（去掉 frontmatter）。 */
export const loadArticleContent = async (slug: string): Promise<string | null> => {
  const meta = articleMetas.find((item) => item.slug === slug);
  if (!meta) {
    return null;
  }

  const loader = resolveLoader(meta.file);
  if (!loader) {
    return null;
  }

  const raw = await loader();
  return parseFrontmatter(raw).content;
};

/** 加载题目答案正文（去掉 frontmatter）。 */
export const loadQuestionAnswer = async (slug: string): Promise<string | null> => {
  const meta = questionMetas.find((item) => item.slug === slug);
  if (!meta) {
    return null;
  }

  const loader = resolveLoader(meta.file);
  if (!loader) {
    return null;
  }

  const raw = await loader();
  return parseFrontmatter(raw).content;
};

/** 组装完整 Article（测试或需要同步结构时使用）。 */
export const toArticle = (meta: (typeof articleMetas)[number], content: string): Article => {
  const { file: _file, ...rest } = meta;
  return { ...rest, content };
};

/** 组装完整 QuestionItem。 */
export const toQuestion = (meta: (typeof questionMetas)[number], answer: string): QuestionItem => {
  const { file: _file, ...rest } = meta;
  return { ...rest, answer };
};
