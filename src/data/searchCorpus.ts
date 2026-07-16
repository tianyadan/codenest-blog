/**
 * 搜索语料单独异步加载，避免首页/列表携带全文。
 */
export const loadSearchableContent = async () => {
  const module = await import('./generated/search-corpus');
  return module.searchableContent;
};
