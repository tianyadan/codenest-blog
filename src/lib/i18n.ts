import type { Language } from '../types/content';

export type Dictionary = {
  nav: {
    home: string;
    articles: string;
    questions: string;
    tags: string;
    search: string;
  };
  actions: {
    searchPlaceholder: string;
    readArticle: string;
    viewQuestion: string;
    toggleTheme: string;
    switchLanguage: string;
  };
  pages: {
    homeTitle: string;
    homeSubtitle: string;
    latestArticles: string;
    questionBanks: string;
    aboutMe: string;
    recentUpdates: string;
    articleIntro: string;
    all: string;
    allArticles: string;
    allQuestions: string;
    globalSearch: string;
    noResults: string;
    notFound: string;
    backHome: string;
  };
  labels: {
    articles: string;
    questions: string;
    tags: string;
    toc: string;
    difficulty: string;
    source: string;
    updatedAt: string;
    readingMinutes: string;
  };
};

const dictionaries: Record<Language, Dictionary> = {
  zh: {
    nav: {
      home: '首页',
      articles: '文章',
      questions: '题库',
      tags: '标签',
      search: '搜索'
    },
    actions: {
      searchPlaceholder: '搜索文章、题目、标签',
      readArticle: '阅读文章',
      viewQuestion: '查看题目',
      toggleTheme: '切换主题',
      switchLanguage: '切换语言'
    },
    pages: {
      homeTitle: 'CodeNest 技术知识库',
      homeSubtitle: '轻量静态站点，沉淀文章与八股文题库。',
      latestArticles: '最新文章',
      questionBanks: '题库分类',
      aboutMe: '关于我',
      recentUpdates: '最近更新',
      articleIntro: '记录技术成长，沉淀知识价值。',
      all: '全部',
      allArticles: '全部文章',
      allQuestions: '全部题目',
      globalSearch: '全局搜索',
      noResults: '没有找到匹配内容',
      notFound: '页面不存在',
      backHome: '返回首页'
    },
    labels: {
      articles: '文章',
      questions: '题目',
      tags: '标签',
      toc: '目录',
      difficulty: '难度',
      source: '来源',
      updatedAt: '更新于',
      readingMinutes: '分钟阅读'
    }
  },
  en: {
    nav: {
      home: 'Home',
      articles: 'Articles',
      questions: 'Questions',
      tags: 'Tags',
      search: 'Search'
    },
    actions: {
      searchPlaceholder: 'Search articles, questions, tags',
      readArticle: 'Read article',
      viewQuestion: 'View question',
      toggleTheme: 'Toggle theme',
      switchLanguage: 'Switch language'
    },
    pages: {
      homeTitle: 'CodeNest Knowledge Base',
      homeSubtitle: 'A lightweight static site for articles and interview notes.',
      latestArticles: 'Latest Articles',
      questionBanks: 'Question Banks',
      aboutMe: 'About Me',
      recentUpdates: 'Recent Updates',
      articleIntro: 'Record growth and preserve technical value.',
      all: 'All',
      allArticles: 'All Articles',
      allQuestions: 'All Questions',
      globalSearch: 'Global Search',
      noResults: 'No matching content found',
      notFound: 'Page not found',
      backHome: 'Back home'
    },
    labels: {
      articles: 'Articles',
      questions: 'Questions',
      tags: 'Tags',
      toc: 'Contents',
      difficulty: 'Difficulty',
      source: 'Source',
      updatedAt: 'Updated',
      readingMinutes: 'min read'
    }
  }
};

export const normalizeLanguage = (value: unknown): Language => {
  return value === 'en' || value === 'zh' ? value : 'zh';
};

export const getDictionary = (language: Language): Dictionary => dictionaries[language];
