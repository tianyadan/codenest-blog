import { Link } from 'react-router-dom';
import type { ActivityItem } from '../lib/searchActivity';
import type { Language } from '../types/content';

type LatestActivityTickerProps = {
  items: ActivityItem[];
  language: Language;
  typeLabel: (type: ActivityItem['type']) => string;
};

/** 搜索页上方的最新动态，纵向缓慢滚动，可点击跳转。 */
export function LatestActivityTicker({ items, language, typeLabel }: LatestActivityTickerProps) {
  if (items.length === 0) {
    return null;
  }

  // 复制一份做无缝滚动。
  const loopItems = [...items, ...items];

  return (
    <div className="search-ticker" aria-label={language === 'zh' ? '最新动态' : 'Latest updates'}>
      <div className="search-ticker-viewport">
        <div className="search-ticker-track">
          {loopItems.map((item, index) => (
            <Link className="search-ticker-item" to={item.href} key={`${item.id}-${index}`}>
              <span className="search-ticker-type">{typeLabel(item.type)}</span>
              <span className="search-ticker-title">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
