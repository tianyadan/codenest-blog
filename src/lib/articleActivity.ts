/** 把文章时间收成 YYYY-MM-DD。带时分秒的值只取日期。 */
export const toArticleDay = (value: string): string | null => {
  const day = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
};

/** 按当天文章数映射成 GitHub 热力图的 5 档颜色。 */
export const heatLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
};

export type HeatCell = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  /** 落在所选年份且不晚于今天的格子。 */
  active: boolean;
};

export type HeatWeek = {
  /** 这一周里出现的每月 1 日，用来标月份。 */
  monthStart: string | null;
  cells: HeatCell[];
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDay = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** 把文章日期收成按天计数。 */
export const countArticlesByDay = (articleDates: string[]): Map<string, number> => {
  const counts = new Map<string, number>();

  articleDates.forEach((value) => {
    const day = toArticleDay(value);
    if (!day) {
      return;
    }
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });

  return counts;
};

/** 热力图最早只展示这一年，避免缺省日期把列表拉到 1970。 */
export const HEATMAP_START_YEAR = 2025;

/**
 * 热力图可选年份：从 2025 到今年。
 * 更早的文章日期不参与，避免年份按钮把页面撑得很长。
 */
export const listHeatmapYears = (articleDates: string[], today = new Date()): number[] => {
  const currentYear = today.getFullYear();
  const years: number[] = [];

  articleDates.forEach((value) => {
    const day = toArticleDay(value);
    if (!day) {
      return;
    }
    const year = Number(day.slice(0, 4));
    if (year >= HEATMAP_START_YEAR && year <= currentYear && !years.includes(year)) {
      years.push(year);
    }
  });

  if (!years.includes(currentYear) && currentYear >= HEATMAP_START_YEAR) {
    years.push(currentYear);
  }

  return years.sort((left, right) => right - left);
};

/**
 * 生成指定年份的文章热力图。一周从周日开始，和 GitHub 贡献图一致。
 * 过去年份铺满该年；当前年份只画到今天。
 */
export const buildArticleHeatmap = (articleDates: string[], year: number, today = new Date()): HeatWeek[] => {
  const counts = countArticlesByDay(articleDates);
  const endOfYear = startOfDay(new Date(year, 11, 31));
  const todayStart = startOfDay(today);
  const rangeEnd = year === today.getFullYear() ? todayStart : endOfYear;
  const yearStart = startOfDay(new Date(year, 0, 1));
  const gridStart = addDays(yearStart, -yearStart.getDay());
  const weeks: HeatWeek[] = [];

  let cursor = gridStart;
  while (cursor.getTime() <= rangeEnd.getTime() || weeks.length === 0) {
    const cells: HeatCell[] = [];
    let monthStart: string | null = null;

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(cursor, dayIndex);
      const key = formatDay(date);
      const inYear = date.getFullYear() === year;
      const active = inYear && date.getTime() <= todayStart.getTime();
      const count = active ? (counts.get(key) ?? 0) : 0;

      if (inYear && date.getDate() === 1) {
        monthStart = key;
      }

      cells.push({
        date: key,
        count,
        level: heatLevel(count),
        active
      });
    }

    weeks.push({ monthStart, cells });
    cursor = addDays(cursor, 7);

    // 当前周最后一天已经盖过 rangeEnd，下一周就停。
    if (addDays(cursor, -1).getTime() >= rangeEnd.getTime()) {
      break;
    }
  }

  return weeks;
};

/** 选定年份内的文章更新总数。 */
export const countArticlesInYear = (articleDates: string[], year: number): number => {
  const counts = countArticlesByDay(articleDates);
  let total = 0;

  counts.forEach((count, day) => {
    if (day.startsWith(`${year}-`)) {
      total += count;
    }
  });

  return total;
};

/** 按题目数量取前几名题库，数量相同则保持原顺序。 */
export const pickTopQuestionBanks = <T extends { slug: string }>(
  banks: T[],
  questionCount: (bank: T) => number,
  limit = 4
): T[] =>
  banks
    .map((bank, index) => ({ bank, index, count: questionCount(bank) }))
    .sort((left, right) => right.count - left.count || left.index - right.index)
    .slice(0, limit)
    .map((item) => item.bank);
