interface PageHeaderProps {
  description?: string;
  breadcrumbs: string[];
  onManual?: () => void;
}

export default function PageHeader({
  description,
  breadcrumbs,
  onManual,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-context-row">
        <div className="page-navigation-area">
          <nav className="breadcrumb" aria-label="현재 위치">
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={breadcrumb}>
                {index > 0 ? '>' : ''}
                {breadcrumb}
              </span>
            ))}
          </nav>
          <button
            type="button"
            className="manual-icon-button"
            aria-label="프로그램 매뉴얼"
            title="프로그램 매뉴얼"
            onClick={onManual}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v15a2.5 2.5 0 0 0-2.5-2.5H4z" />
              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17a2.5 2.5 0 0 1 2.5-2.5H20z" />
            </svg>
          </button>
        </div>
        {description ? <p className="program-summary">{description}</p> : null}
      </div>
    </div>
  );
}
