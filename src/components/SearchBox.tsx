import { FormEvent, useEffect, useState } from 'react';
import { SearchIcon } from './Icons';

type SearchBoxProps = {
  placeholder: string;
  initialValue?: string;
  compact?: boolean;
  autoFocus?: boolean;
  /** 顶栏点击后直接进搜索页，不在顶栏搜。 */
  onActivate?: () => void;
  /** 输入变化（搜索页用，配合防抖）。 */
  onQueryChange?: (keyword: string) => void;
  onSearch?: (keyword: string) => void;
};

export function SearchBox({
  placeholder,
  initialValue = '',
  compact = false,
  autoFocus = false,
  onActivate,
  onQueryChange,
  onSearch
}: SearchBoxProps) {
  const [keyword, setKeyword] = useState(initialValue);
  const value = onQueryChange ? initialValue : keyword;

  useEffect(() => {
    if (!onQueryChange) {
      setKeyword(initialValue);
    }
  }, [initialValue, onQueryChange]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onActivate) {
      onActivate();
      return;
    }
    onSearch?.(value.trim());
  };

  return (
    <form
      className={compact ? 'search-box search-box-compact' : 'search-box'}
      onSubmit={handleSubmit}
      onClick={onActivate}
    >
      <label className="sr-only" htmlFor={compact ? 'global-search-compact' : 'global-search'}>
        {placeholder}
      </label>
      <input
        id={compact ? 'global-search-compact' : 'global-search'}
        value={value}
        readOnly={Boolean(onActivate)}
        autoFocus={autoFocus}
        onChange={(event) => {
          const next = event.target.value;
          if (onQueryChange) {
            onQueryChange(next);
            return;
          }
          setKeyword(next);
        }}
        onFocus={onActivate}
        placeholder={placeholder}
        type="search"
      />
      <button className="search-text-button" type="submit">
        Search
      </button>
      <button className="search-icon-button" type="submit" aria-label="Search">
        <SearchIcon />
      </button>
    </form>
  );
}
