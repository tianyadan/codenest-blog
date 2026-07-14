import type { TocItem } from '../types/content';

export const slugifyHeading = (text: string) => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
};

export const extractTableOfContents = (markdown: string): TocItem[] => {
  const slugCount = new Map<string, number>();

  return markdown
    .split('\n')
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const level = match[1].length;
      const text = match[2].trim();
      const baseSlug = slugifyHeading(text);
      const currentCount = slugCount.get(baseSlug) ?? 0;
      slugCount.set(baseSlug, currentCount + 1);

      // WHY: 同一篇文章可能存在重复标题，构建稳定锚点避免目录跳转冲突。
      const id = currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;
      return { id, level, text };
    });
};
