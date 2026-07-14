import { FormEvent, useState } from 'react';
import { SearchIcon } from './Icons';

type SearchBoxProps = {
  placeholder: string;
  initialValue?: string;
  compact?: boolean;
  onSearch: (keyword: string) => void;
};

export function SearchBox({ placeholder, initialValue = '', compact = false, onSearch }: SearchBoxProps) {
  const [keyword, setKeyword] = useState(initialValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedKeyword = keyword.trim();
    if (normalizedKeyword) {
      onSearch(normalizedKeyword);
    }
  };

  return (
    <form className={compact ? 'search-box search-box-compact' : 'search-box'} onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={compact ? 'global-search-compact' : 'global-search'}>
        {placeholder}
      </label>
      <input
        id={compact ? 'global-search-compact' : 'global-search'}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
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
