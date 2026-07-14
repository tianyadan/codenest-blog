import type { SearchResult, SearchableContent } from '../types/content';

const normalizeText = (value: string) => value.trim().toLowerCase();

const countMatches = (source: string, query: string) => {
  if (!query) {
    return 0;
  }
  return normalizeText(source).includes(query) ? 1 : 0;
};

export const searchContent = (items: SearchableContent[], query: string): SearchResult[] => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return items.map((item) => ({ item, score: 0, matchedFields: [] }));
  }

  return items
    .map((item) => {
      const fieldScores = {
        title: countMatches(item.title, normalizedQuery) * 5,
        summary: countMatches(item.summary, normalizedQuery) * 3,
        tags: countMatches(item.tags.join(' '), normalizedQuery) * 4,
        body: countMatches(item.body, normalizedQuery)
      };

      const score = Object.values(fieldScores).reduce((total, current) => total + current, 0);
      const matchedFields = Object.entries(fieldScores)
        .filter(([, fieldScore]) => fieldScore > 0)
        .map(([field]) => field);

      return { item, score, matchedFields };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score);
};
