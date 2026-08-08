import type { ReactNode } from 'react';

interface SearchPanelProps {
  children: ReactNode;
  actions: ReactNode;
}

export default function SearchPanel({ children, actions }: SearchPanelProps) {
  return (
    <section className="search-panel" aria-label="조회 조건">
      <div className="search-actions button-area">{actions}</div>
      <div className="search-grid">{children}</div>
    </section>
  );
}
