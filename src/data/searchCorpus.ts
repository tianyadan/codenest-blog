import type { Language } from '../types/content';

/**
 * 搜索语料单独异步加载，避免首页/列表携带全文。
 * 可选按语言过滤（严格隔离）。
 */
export const loadSearchableContent = async (language?: Language) => {
  const module = await import('./generated/search-corpus');
  if (!language) {
    return module.searchableContent;
  }
  return module.searchableContent.filter((item) => item.lang === language);
};
