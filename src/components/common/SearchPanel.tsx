import type { ReactNode } from 'react';

interface SearchPanelProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

export default function SearchPanel({
  title,
  children,
  actions,
}: SearchPanelProps) {
  return (
    <section className="search-panel" aria-label={title}>
      <div className="section-title-row">
        <h2>{title}</h2>
        <div className="button-area">{actions}</div>
      </div>
      <div className="search-grid">{children}</div>
    </section>
  );
}
