/**
 * 扫描 content/{zh|en}/ 目录，生成文章、题库、题目的元数据与搜索语料。
 * 供 Vite 插件在构建/开发时调用，实现「丢 md 即用」。
 */
import fs from 'node:fs';
import path from 'node:path';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const SUPPORTED_LANGS = ['zh', 'en'];

const stripQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const parseScalar = (raw) => {
  const value = stripQuotes(raw.trim());
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
};

const parseInlineArray = (raw) => {
  const inner = raw.trim().slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter(Boolean);
};

const parseFrontmatter = (raw) => {
  const normalized = raw.replace(/^\uFEFF/, '');
  const matched = normalized.match(FRONTMATTER_PATTERN);
  if (!matched) {
    return { data: {}, content: normalized.trim() };
  }

  const [, yamlBlock, body] = matched;
  const data = {};
  const lines = yamlBlock.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith('#')) {
      index += 1;
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex <= 0) {
      index += 1;
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const remainder = trimmed.slice(separatorIndex + 1).trim();

    if (!remainder) {
      const items = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const next = lines[cursor].trim();
        if (!next.startsWith('- ')) break;
        items.push(stripQuotes(next.slice(2).trim()));
        cursor += 1;
      }
      data[key] = items;
      index = cursor;
      continue;
    }

    data[key] = remainder.startsWith('[') && remainder.endsWith(']')
      ? parseInlineArray(remainder)
      : parseScalar(remainder);
    index += 1;
  }

  return { data, content: body.replace(/^\r?\n/, '').trimEnd() };
};

const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toStringValue = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

const toNumberValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
};

const listMarkdownFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const results = [];

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        results.push(fullPath);
      }
    }
  };

  walk(dir);
  return results.sort((left, right) => left.localeCompare(right));
};

const fileSlug = (filePath) => path.basename(filePath, '.md');

/** 相对仓库根目录的 POSIX 路径，便于和 import.meta.glob 对齐。 */
const toPosixRelative = (rootDir, filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join('/');

export const scanContent = (rootDir) => {
  const contentRoot = path.join(rootDir, 'content');
  const articles = [];
  const questionBanks = [];
  const questions = [];

  for (const lang of SUPPORTED_LANGS) {
    const langRoot = path.join(contentRoot, lang);
    const articleFiles = listMarkdownFiles(path.join(langRoot, 'articles'));
    const bankFiles = listMarkdownFiles(path.join(langRoot, 'banks'));
    const questionFiles = listMarkdownFiles(path.join(langRoot, 'questions'));
    const bankSlugSet = new Set();

    for (const filePath of bankFiles) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data } = parseFrontmatter(raw);
      const slug = toStringValue(data.slug, fileSlug(filePath));
      const order = toNumberValue(data.order);

      questionBanks.push({
        id: toStringValue(data.id, `bank-${lang}-${slug}`),
        lang,
        slug,
        name: toStringValue(data.name, slug),
        description: toStringValue(data.description),
        tags: toStringArray(data.tags),
        ...(order === undefined ? {} : { order })
      });
      bankSlugSet.add(slug);
    }

    for (const filePath of articleFiles) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = parseFrontmatter(raw);
      const slug = toStringValue(data.slug, fileSlug(filePath));
      const readingMinutes = toNumberValue(data.readingMinutes) ?? Math.max(1, Math.ceil(content.length / 400));
      const topOrder = toNumberValue(data.topOrder);

      const rawCategory = toStringValue(data.category, 'learning');
      const category = ['learning', 'work', 'diary'].includes(rawCategory) ? rawCategory : 'learning';

      articles.push({
        id: toStringValue(data.id, `article-${lang}-${slug}`),
        lang,
        slug,
        title: toStringValue(data.title, slug),
        summary: toStringValue(data.summary),
        author: toStringValue(data.author, 'CodeNest'),
        category,
        tags: toStringArray(data.tags),
        createdAt: toStringValue(data.createdAt, '1970-01-01'),
        updatedAt: toStringValue(data.updatedAt, toStringValue(data.createdAt, '1970-01-01')),
        readingMinutes,
        ...(topOrder === undefined ? {} : { topOrder }),
        file: toPosixRelative(rootDir, filePath),
        body: content
      });
    }

    for (const filePath of questionFiles) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = parseFrontmatter(raw);
      const slug = toStringValue(data.slug, fileSlug(filePath));
      const relativeFromQuestions = path.relative(path.join(langRoot, 'questions'), filePath);
      const folderBank = relativeFromQuestions.includes(path.sep)
        ? relativeFromQuestions.split(path.sep)[0]
        : '';
      const bankSlug = toStringValue(data.bank, folderBank || 'general');

      if (bankSlug && !bankSlugSet.has(bankSlug)) {
        questionBanks.push({
          id: `bank-${lang}-${bankSlug}`,
          lang,
          slug: bankSlug,
          name: bankSlug,
          description: '',
          tags: []
        });
        bankSlugSet.add(bankSlug);
      }

      const rawDifficulty = toStringValue(data.difficulty, 'medium');
      const difficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : 'medium';

      questions.push({
        id: toStringValue(data.id, `question-${lang}-${slug}`),
        lang,
        slug,
        bankSlug,
        title: toStringValue(data.title, slug),
        description: toStringValue(data.description),
        tags: toStringArray(data.tags),
        difficulty,
        ...(data.source ? { source: toStringValue(data.source) } : {}),
        file: toPosixRelative(rootDir, filePath),
        body: content
      });
    }
  }

  const articleMetas = articles.map(({ body, file, ...meta }) => ({ ...meta, file }));
  const questionMetas = questions.map(({ body, file, ...meta }) => ({ ...meta, file }));

  const searchableContent = [
    ...articles.map((article) => ({
      id: article.id,
      lang: article.lang,
      type: 'article',
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      tags: article.tags,
      body: article.body
    })),
    ...questions.map((question) => ({
      id: question.id,
      lang: question.lang,
      type: 'question',
      slug: question.slug,
      bankSlug: question.bankSlug,
      title: question.title,
      summary: question.description,
      tags: question.tags,
      body: question.body
    }))
  ];

  return {
    articleMetas,
    questionMetas,
    questionBanks: questionBanks.sort((left, right) => {
      const langCompare = left.lang.localeCompare(right.lang);
      if (langCompare !== 0) return langCompare;
      const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER;
      const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.slug.localeCompare(right.slug);
    }),
    searchableContent
  };
};

export const renderContentModules = (rootDir) => {
  const scanned = scanContent(rootDir);
  const serialize = (value) => JSON.stringify(value, null, 2);

  return {
    articleMetas: scanned.articleMetas,
    questionMetas: scanned.questionMetas,
    questionBanks: scanned.questionBanks,
    searchableContent: scanned.searchableContent,
    indexModule: `/* eslint-disable */
// AUTO-GENERATED by scripts/generate-content.mjs. Do not edit.
import type { ArticleCategory, Difficulty, Language, QuestionBank } from '../../types/content';

export type ArticleMeta = {
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
  file: string;
};

export type QuestionMeta = {
  id: string;
  lang: Language;
  slug: string;
  bankSlug: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: Difficulty;
  source?: string;
  file: string;
};

export type QuestionBankMeta = QuestionBank & { lang: Language };

export const articleMetas: ArticleMeta[] = ${serialize(scanned.articleMetas)};

export const questionMetas: QuestionMeta[] = ${serialize(scanned.questionMetas)};

export const questionBanks: QuestionBankMeta[] = ${serialize(scanned.questionBanks)};
`,
    searchModule: `/* eslint-disable */
// AUTO-GENERATED by scripts/generate-content.mjs. Do not edit.
import type { Language, SearchableContent } from '../../types/content';

export type SearchableContentMeta = SearchableContent & { lang: Language };

export const searchableContent: SearchableContentMeta[] = ${serialize(scanned.searchableContent)};
`
  };
};
