import { useMemo, useState } from 'react';
import {
  buildArticleHeatmap,
  countArticlesInYear,
  listHeatmapYears,
  type HeatCell
} from '../lib/articleActivity';
import type { Language } from '../types/content';

type ArticleHeatmapProps = {
  /** 文章的 createdAt / updatedAt，只传文章。 */
  dates: string[];
  language: Language;
  title: string;
  lessLabel: string;
  moreLabel: string;
};

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 月份标签：中文用「9月」，英文用 Jan。 */
const formatMonth = (monthStart: string | null, language: Language) => {
  if (!monthStart) {
    return '';
  }

  const month = Number(monthStart.slice(5, 7));
  if (language === 'zh') {
    return `${month}月`;
  }

  return MONTHS_EN[month - 1] ?? '';
};

/** 点击格子后的说明文案。 */
const formatCellDetail = (cell: HeatCell, language: Language) => {
  if (language === 'zh') {
    return `${cell.date} · ${cell.count} 篇`;
  }

  return `${cell.date} · ${cell.count} article${cell.count === 1 ? '' : 's'}`;
};

/** 首页文章更新热力图，样式对齐 GitHub 贡献图。 */
export function ArticleHeatmap({ dates, language, title, lessLabel, moreLabel }: ArticleHeatmapProps) {
  const years = useMemo(() => listHeatmapYears(dates), [dates]);
  const [selectedYear, setSelectedYear] = useState(years[0] ?? new Date().getFullYear());
  const [selectedCell, setSelectedCell] = useState<HeatCell | null>(null);

  const year = years.includes(selectedYear) ? selectedYear : (years[0] ?? new Date().getFullYear());
  const weeks = useMemo(() => buildArticleHeatmap(dates, year), [dates, year]);
  const total = useMemo(() => countArticlesInYear(dates, year), [dates, year]);
  const summary =
    language === 'zh' ? `${year} 年更新 ${total} 篇文章` : `${total} article updates in ${year}`;

  /** 切换年份时清掉上一次点选。 */
  const selectYear = (nextYear: number) => {
    setSelectedYear(nextYear);
    setSelectedCell(null);
  };

  return (
    <section className="home-section article-heatmap" aria-label={title}>
      <div className="home-section-heading">
        <h2>{title}</h2>
        <p className="heatmap-summary">{summary}</p>
      </div>

      <div className="heatmap-body">
        <div className="heatmap-main">
          <div className="heatmap-scroll">
            <div className="heatmap-months" aria-hidden="true">
              {weeks.map((week) => (
                <span key={week.cells[0]?.date ?? 'week'}>{formatMonth(week.monthStart, language)}</span>
              ))}
            </div>
            <div className="heatmap-grid" role="grid" aria-label={summary}>
              {weeks.flatMap((week) =>
                week.cells.map((cell) => (
                  <button
                    type="button"
                    className={`heat-cell level-${cell.level}${cell.active ? '' : ' is-muted'}${
                      selectedCell?.date === cell.date ? ' is-selected' : ''
                    }`}
                    key={cell.date}
                    disabled={!cell.active}
                    aria-label={cell.active ? formatCellDetail(cell, language) : undefined}
                    onClick={() => setSelectedCell(cell)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="heatmap-footer">
            <p className="heatmap-detail" aria-live="polite">
              {selectedCell ? formatCellDetail(selectedCell, language) : language === 'zh' ? '点击格子查看当天更新' : 'Click a day to see updates'}
            </p>
            <div className="heatmap-legend">
              <span>{lessLabel}</span>
              <span className="heat-cell level-0" />
              <span className="heat-cell level-1" />
              <span className="heat-cell level-2" />
              <span className="heat-cell level-3" />
              <span className="heat-cell level-4" />
              <span>{moreLabel}</span>
            </div>
          </div>
        </div>

        <div className="heatmap-years" aria-label={language === 'zh' ? '选择年份' : 'Select year'}>
          {years.map((item) => (
            <button type="button" className={item === year ? 'active' : ''} key={item} onClick={() => selectYear(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
