import { describe, expect, it } from 'vitest';
import {
  buildArticleHeatmap,
  countArticlesInYear,
  heatLevel,
  listHeatmapYears,
  pickTopQuestionBanks,
  toArticleDay
} from './articleActivity';

describe('article activity', () => {
  it('keeps only the calendar day from an article timestamp', () => {
    expect(toArticleDay('2026-09-21 10:56:00')).toBe('2026-09-21');
    expect(toArticleDay('2026-04-04')).toBe('2026-04-04');
    expect(toArticleDay('not-a-date')).toBeNull();
  });

  it('maps article counts onto five green levels', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(2)).toBe(2);
    expect(heatLevel(4)).toBe(3);
    expect(heatLevel(5)).toBe(4);
  });

  it('starts heatmap years at 2025 and ignores earlier dates', () => {
    expect(listHeatmapYears(['1970-01-01', '2024-01-01', '2025-03-01', '2026-09-21'], new Date(2026, 8, 21))).toEqual([
      2026,
      2025
    ]);
    expect(listHeatmapYears([], new Date(2026, 8, 21))).toEqual([2026]);
  });

  it('builds a year grid and counts only that year', () => {
    const weeks = buildArticleHeatmap(
      ['2026-09-21 08:00:00', '2026-09-21', '2025-03-01', '2024-01-01'],
      2026,
      new Date(2026, 8, 21)
    );
    const cells = weeks.flatMap((week) => week.cells);
    const today = cells.find((cell) => cell.date === '2026-09-21');

    expect(weeks.every((week) => week.cells.length === 7)).toBe(true);
    expect(today).toMatchObject({ count: 2, level: 2, active: true });
    expect(cells.filter((cell) => cell.date.startsWith('2025-')).every((cell) => !cell.active && cell.count === 0)).toBe(true);
    expect(countArticlesInYear(['2026-09-21', '2026-09-21', '2025-03-01'], 2026)).toBe(2);
    expect(cells.filter((cell) => cell.date > '2026-09-21').every((cell) => !cell.active)).toBe(true);
  });

  it('fills a past year through December', () => {
    const weeks = buildArticleHeatmap(['2025-06-15'], 2025, new Date(2026, 8, 21));
    const cells = weeks.flatMap((week) => week.cells);

    expect(cells.some((cell) => cell.date === '2025-12-31' && cell.active)).toBe(true);
    expect(cells.find((cell) => cell.date === '2025-06-15')).toMatchObject({ count: 1, level: 1 });
  });

  it('keeps the four question banks with the most questions', () => {
    const banks = [
      { slug: 'small' },
      { slug: 'large' },
      { slug: 'medium' },
      { slug: 'tied' },
      { slug: 'also-tied' },
      { slug: 'empty' }
    ];
    const counts: Record<string, number> = { small: 1, large: 20, medium: 8, tied: 3, 'also-tied': 3, empty: 0 };

    expect(pickTopQuestionBanks(banks, (bank) => counts[bank.slug] ?? 0).map((bank) => bank.slug)).toEqual([
      'large',
      'medium',
      'tied',
      'also-tied'
    ]);
  });
});
