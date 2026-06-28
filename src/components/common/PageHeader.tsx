import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      {breadcrumbs ? (
        <nav className="breadcrumb" aria-label="breadcrumb">
          {breadcrumbs.map((breadcrumb, index) => (
            <span key={breadcrumb}>
              {index > 0 ? '>' : ''}
              {breadcrumb}
            </span>
          ))}
        </nav>
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="button-area">{actions}</div> : null}
      </div>
    </div>
  );
}
