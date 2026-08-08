import { Children, type ReactNode } from 'react';

export type SearchPanelRows = 1 | 2 | 3;

interface SearchPanelProps {
  children: ReactNode;
  actions: ReactNode;
  rows?: SearchPanelRows;
}

const SEARCH_COLUMN_COUNT = 4;

export default function SearchPanel({
  children,
  actions,
  rows = 1,
}: SearchPanelProps) {
  const conditionCount = Children.toArray(children).length;
  const maxConditionCount = rows * SEARCH_COLUMN_COUNT;

  if (conditionCount > maxConditionCount) {
    throw new Error(
      `SearchPanel ${rows}단은 검색조건을 최대 ${maxConditionCount}개까지 배치할 수 있습니다.`,
    );
  }

  return (
    <section className="search-panel" aria-label="조회 조건">
      <div className={`search-panel-layout search-panel-rows-${rows}`}>
        <div className="search-grid">{children}</div>
        <div className="search-panel-actions button-area">{actions}</div>
      </div>
    </section>
  );
}
