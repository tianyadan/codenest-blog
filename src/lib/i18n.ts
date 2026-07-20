import type { Language } from '../types/content';

export type Dictionary = {
  nav: {
    home: string;
    articles: string;
    questions: string;
    prompts: string;
    tags: string;
    search: string;
  };
  actions: {
    searchPlaceholder: string;
    readArticle: string;
    viewQuestion: string;
    viewPrompt: string;
    viewBank: string;
    backToBanks: string;
    backToQuestions: string;
    backToPrompts: string;
    toggleTheme: string;
    switchLanguage: string;
    copyEmail: string;
    copied: string;
    close: string;
    previousPage: string;
    nextPage: string;
  };
  pages: {
    homeTitle: string;
    homeSubtitle: string;
    latestArticles: string;
    questionBanks: string;
    questionBankIntro: string;
    aboutMe: string;
    aboutMeBio1: string;
    aboutMeBio2: string;
    footerTagline: string;
    emailTitle: string;
    recentUpdates: string;
    articleIntro: string;
    promptIntro: string;
    all: string;
    allArticles: string;
    allQuestions: string;
    allPrompts: string;
    articleCategories: string;
    promptCategories: string;
    viewAllArticles: string;
    emptyBank: string;
    emptyPrompts: string;
    globalSearch: string;
    noResults: string;
    notFound: string;
    backHome: string;
  };
  labels: {
    articles: string;
    questions: string;
    prompts: string;
    questionCount: string;
    tags: string;
    toc: string;
    difficulty: string;
    source: string;
    updatedAt: string;
    readingMinutes: string;
    github: string;
    email: string;
  };
};

const dictionaries: Record<Language, Dictionary> = {
  zh: {
    nav: {
      home: '首页',
      articles: '文章',
      questions: '题库',
      prompts: '提示词',
      tags: '标签',
      search: '搜索'
    },
    actions: {
      searchPlaceholder: '搜索文章、题库、提示词、标签',
      readArticle: '阅读文章',
      viewQuestion: '查看题目',
      viewPrompt: '查看提示词',
      viewBank: '进入题库',
      backToBanks: '返回题库分类',
      backToQuestions: '返回题目列表',
      backToPrompts: '返回提示词列表',
      toggleTheme: '切换主题',
      switchLanguage: '切换语言',
      copyEmail: '复制邮箱',
      copied: '已复制',
      close: '关闭',
      previousPage: '上一页',
      nextPage: '下一页'
    },
    pages: {
      homeTitle: 'CodeNest 技术知识库',
      homeSubtitle: '轻量静态站点，沉淀文章、题库与开发提示词。',
      latestArticles: '最新文章',
      questionBanks: '题库分类',
      questionBankIntro: '先选分类，再刷题目，逐层深入学习。',
      aboutMe: '关于我',
      aboutMeBio1: '热爱编程，喜欢研究技术与业务结合的可能性。',
      aboutMeBio2: '专注于 Java 后端开发，沉淀知识，分享成长。',
      footerTagline: '专注技术成长 · 持续输出价值',
      emailTitle: '联系邮箱',
      recentUpdates: '最近更新',
      articleIntro: '记录技术成长，沉淀知识价值。',
      promptIntro: '收集可复用的开发提示词，按场景快速调用。',
      all: '全部',
      allArticles: '全部文章',
      allQuestions: '全部题目',
      allPrompts: '全部提示词',
      articleCategories: '文章分类',
      promptCategories: '提示词分类',
      viewAllArticles: '查看全部文章',
      emptyBank: '该分类暂无题目，敬请期待。',
      emptyPrompts: '该分类暂无提示词，敬请期待。',
      globalSearch: '全局搜索',
      noResults: '没有找到匹配内容',
      notFound: '页面不存在',
      backHome: '返回首页'
    },
    labels: {
      articles: '文章',
      questions: '题目',
      prompts: '提示词',
      questionCount: '道题目',
      tags: '标签',
      toc: '目录',
      difficulty: '难度',
      source: '来源',
      updatedAt: '更新于',
      readingMinutes: '分钟阅读',
      github: 'GitHub',
      email: '邮箱'
    }
  },
  en: {
    nav: {
      home: 'Home',
      articles: 'Articles',
      questions: 'Questions',
      prompts: 'Prompts',
      tags: 'Tags',
      search: 'Search'
    },
    actions: {
      searchPlaceholder: 'Search articles, questions, prompts, tags',
      readArticle: 'Read article',
      viewQuestion: 'View question',
      viewPrompt: 'View prompt',
      viewBank: 'Open bank',
      backToBanks: 'Back to banks',
      backToQuestions: 'Back to questions',
      backToPrompts: 'Back to prompts',
      toggleTheme: 'Toggle theme',
      switchLanguage: 'Switch language',
      copyEmail: 'Copy email',
      copied: 'Copied',
      close: 'Close',
      previousPage: 'Previous page',
      nextPage: 'Next page'
    },
    pages: {
      homeTitle: 'CodeNest Knowledge Base',
      homeSubtitle: 'A lightweight static site for articles, interview notes, and prompts.',
      latestArticles: 'Latest Articles',
      questionBanks: 'Question Banks',
      questionBankIntro: 'Pick a category first, then drill into questions.',
      aboutMe: 'About Me',
      aboutMeBio1: 'Passionate about programming and exploring how technology integrates with business.',
      aboutMeBio2: 'Focused on Java backend development — building knowledge and sharing growth.',
      footerTagline: 'Focused on technical growth · Continuous value creation',
      emailTitle: 'Contact Email',
      recentUpdates: 'Recent Updates',
      articleIntro: 'Record growth and preserve technical value.',
      promptIntro: 'Reusable development prompts, organized by common engineering scenarios.',
      all: 'All',
      allArticles: 'All Articles',
      allQuestions: 'All Questions',
      allPrompts: 'All Prompts',
      articleCategories: 'Article Categories',
      promptCategories: 'Prompt Categories',
      viewAllArticles: 'View All Articles',
      emptyBank: 'No questions in this bank yet.',
      emptyPrompts: 'No prompts in this category yet.',
      globalSearch: 'Global Search',
      noResults: 'No matching content found',
      notFound: 'Page not found',
      backHome: 'Back home'
    },
    labels: {
      articles: 'Articles',
      questions: 'Questions',
      prompts: 'Prompts',
      questionCount: 'questions',
      tags: 'Tags',
      toc: 'Contents',
      difficulty: 'Difficulty',
      source: 'Source',
      updatedAt: 'Updated',
      readingMinutes: 'min read',
      github: 'GitHub',
      email: 'Email'
    }
  }
};

export const normalizeLanguage = (value: unknown): Language => {
  return value === 'en' || value === 'zh' ? value : 'zh';
};

export const getDictionary = (language: Language): Dictionary => dictionaries[language];
