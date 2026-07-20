export type Language = 'zh' | 'en';

export type ThemeMode = 'light' | 'dark';

export type ContentType = 'article' | 'question' | 'prompt';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ArticleCategory = 'learning' | 'work' | 'diary';

/** 提示词分类。 */
export type PromptCategory =
  | 'frontend'
  | 'backend'
  | 'ui'
  | 'schema'
  | 'backend-test'
  | 'ops'
  | 'sql'
  | 'code-review'
  | 'product';

export type Article = {
  id: string;
  lang: Language;
  slug: string;
  title: string;
  summary: string;
  author: string;
  category: ArticleCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
  topOrder?: number;
  content: string;
};

export type Prompt = {
  id: string;
  lang: Language;
  slug: string;
  title: string;
  summary: string;
  author: string;
  category: PromptCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  content: string;
};

export type QuestionBank = {
  id: string;
  lang: Language;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  /** 题库展示排序，越小越靠前。 */
  order?: number;
};

export type QuestionItem = {
  id: string;
  lang: Language;
  slug: string;
  bankSlug: string;
  title: string;
  description: string;
  answer: string;
  tags: string[];
  difficulty: Difficulty;
  source?: string;
};

export type SearchableContent = {
  id: string;
  lang: Language;
  type: ContentType;
  slug: string;
  /** 题目所属题库，用于拼详情路径。 */
  bankSlug?: string;
  title: string;
  summary: string;
  tags: string[];
  body: string;
};

export type SearchResult = {
  item: SearchableContent;
  score: number;
  matchedFields: string[];
};

export type TocItem = {
  id: string;
  level: number;
  text: string;
};
