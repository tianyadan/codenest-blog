import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_ORIGIN = 'https://www.codenest.com.cn';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 旧站题库 ID 固定，显式映射可保证 URL 和目录长期稳定。 */
const bankSlugs = new Map([
  [1, 'html'], [2, 'css'], [3, 'javascript'], [4, 'typescript'], [5, 'java'], [6, 'spring-boot'],
  [7, 'spring'], [8, 'linux'], [9, 'computer-network'], [10, 'algorithm'], [11, 'design-patterns'],
  [12, 'mysql'], [13, 'redis'], [14, 'computer-basics'], [114, 'java-concurrency'],
  [115, 'spring-cloud'], [116, 'data-structures'], [117, 'llm'], [118, 'go'],
  [119, 'message-queue'], [120, 'jvm']
]);

const quote = (value) => JSON.stringify(String(value ?? ''));
const toTags = (value) => String(value ?? '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);

const normalizeDifficulty = (difficulty) => ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';

export const getBankSlug = (bank) => bankSlugs.get(Number(bank.id)) ?? `bank-${bank.id}`;

export function toBankMarkdown(bank, order = Number(bank.id)) {
  return `---\nname: ${quote(bank.name)}\ndescription: ${quote(bank.description)}\ntags: ${JSON.stringify(toTags(bank.tags))}\norder: ${order}\n---\n`;
}

/**
 * 题干和 answer 原样写入；只新增博客渲染所需的 frontmatter 与“答案”标题。
 */
export function toQuestionMarkdown(question, bankName) {
  const source = question.source ? `\nsource: ${quote(question.source)}` : '';
  const answer = String(question.answer ?? '');
  return `---\ntitle: ${quote(question.name)}\ndescription: ${quote(`${bankName} · 原站真题整理`)}\ntags: ${JSON.stringify(toTags(question.tags))}\ndifficulty: ${normalizeDifficulty(question.difficulty)}${source}\n---\n\n## 答案\n\n${answer}`;
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`请求失败 ${response.status}: ${url}`);
  const payload = await response.json();
  if (!payload.success) throw new Error(`接口返回失败: ${payload.message ?? url}`);
  return payload.data;
}

export async function fetchAllQuestions(bankId, apiOrigin = DEFAULT_API_ORIGIN) {
  const questions = [];
  let cursor;
  do {
    const params = new URLSearchParams({ bankId: String(bankId), size: '100' });
    if (cursor != null) params.set('cursor', String(cursor));
    const page = await requestJson(`${apiOrigin}/api/question-bank-questions/cursor-query-questions?${params}`);
    questions.push(...page.list);
    cursor = page.nextCursor;
    if (!page.hasMore) break;
  } while (cursor != null);
  return questions;
}

export async function migrateQuestionBanks({ apiOrigin = DEFAULT_API_ORIGIN, outputDir = rootDir, logger = console } = {}) {
  const bankPage = await requestJson(`${apiOrigin}/api/question-banks?page=1&size=2000`);
  const banks = bankPage.records;
  let totalQuestions = 0;

  for (const [index, bank] of banks.entries()) {
    const slug = getBankSlug(bank);
    const bankPath = path.join(outputDir, 'content/zh/banks', `${slug}.md`);
    const questionsPath = path.join(outputDir, 'content/zh/questions', slug);
    const questions = await fetchAllQuestions(bank.id, apiOrigin);

    await fs.mkdir(questionsPath, { recursive: true });
    await fs.writeFile(bankPath, toBankMarkdown(bank, index + 1), 'utf8');
    await Promise.all(questions.map((question) => fs.writeFile(
      path.join(questionsPath, `question-${question.id}.md`),
      toQuestionMarkdown(question, bank.name),
      'utf8'
    )));

    totalQuestions += questions.length;
    logger.log(`已迁移 ${bank.name}: ${questions.length} 题`);
  }

  return { bankCount: banks.length, questionCount: totalQuestions };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await migrateQuestionBanks();
  console.log(`迁移完成：${result.bankCount} 个题库，${result.questionCount} 道题。`);
}
