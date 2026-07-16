/**
 * 轻量 frontmatter 解析：避免引入 gray-matter 等依赖，保持构建简单。
 * 仅支持博客场景常见的标量、数组与布尔/数字。
 */

export type FrontmatterValue = string | number | boolean | string[];

export type ParsedMarkdown = {
  data: Record<string, FrontmatterValue>;
  content: string;
};

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** 去掉成对引号，便于 title: "xxx" 这类写法。 */
const stripQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

/** 把 YAML 风格的简单值转成 JS 类型。 */
const parseScalar = (raw: string): FrontmatterValue => {
  const value = stripQuotes(raw.trim());

  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
};

/** 解析 [a, b] 或 ['a', "b"] 内联数组。 */
const parseInlineArray = (raw: string): string[] => {
  const inner = raw.trim().slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(',')
    .map((item) => stripQuotes(item.trim()))
    .filter(Boolean);
};

/**
 * 解析 Markdown 文件头部的 YAML frontmatter。
 * WHY: 内容仓库用 md + 元数据即可驱动列表/搜索，正文再按需加载。
 */
export const parseFrontmatter = (raw: string): ParsedMarkdown => {
  const normalized = raw.replace(/^\uFEFF/, '');
  const matched = normalized.match(FRONTMATTER_PATTERN);

  if (!matched) {
    return { data: {}, content: normalized.trim() };
  }

  const [, yamlBlock, body] = matched;
  const data: Record<string, FrontmatterValue> = {};
  const lines = yamlBlock.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

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
      // 支持多行数组：
      // tags:
      //   - Spring
      //   - Redis
      const items: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const next = lines[cursor].trim();
        if (!next.startsWith('- ')) {
          break;
        }
        items.push(stripQuotes(next.slice(2).trim()));
        cursor += 1;
      }
      data[key] = items;
      index = cursor;
      continue;
    }

    if (remainder.startsWith('[') && remainder.endsWith(']')) {
      data[key] = parseInlineArray(remainder);
    } else {
      data[key] = parseScalar(remainder);
    }
    index += 1;
  }

  return {
    data,
    content: body.replace(/^\r?\n/, '').trimEnd()
  };
};

/** 把 frontmatter 字段规范成 string[]。 */
export const toStringArray = (value: FrontmatterValue | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

/** 把 frontmatter 字段规范成 string。 */
export const toStringValue = (value: FrontmatterValue | undefined, fallback = ''): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

/** 把 frontmatter 字段规范成 number。 */
export const toNumberValue = (value: FrontmatterValue | undefined): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
};
