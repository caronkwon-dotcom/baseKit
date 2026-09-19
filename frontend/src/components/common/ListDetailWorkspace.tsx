import type { ReactNode } from 'react';

export type ListDetailWorkspaceMode = 'LIST' | 'DETAIL' | 'DETAIL_EXPANDED';

interface ListDetailWorkspaceProps {
  mode: ListDetailWorkspaceMode;
  list: ReactNode;
  detail: ReactNode;
  onModeChange: (mode: ListDetailWorkspaceMode) => void;
  collapsible?: boolean;
}

export default function ListDetailWorkspace({
  mode,
  list,
  detail,
  onModeChange,
  collapsible = true,
}: ListDetailWorkspaceProps) {
  const detailVisible = mode !== 'LIST';
  const detailExpanded = mode === 'DETAIL_EXPANDED';

  return (
    <section className={`list-detail-workspace list-detail-workspace--${mode}`} aria-label="목록 및 상세 작업 영역">
      <section className="list-detail-workspace__list">
        <div className="list-detail-workspace__content">{list}</div>
      </section>
      {detailVisible ? (
        <section className="list-detail-workspace__detail">
          <div className="list-detail-workspace__content">{detail}</div>
          {collapsible ? (
            <button
              type="button"
              className="list-detail-workspace__toggle secondary-button"
              aria-expanded={!detailExpanded}
              onClick={() => onModeChange(detailExpanded ? 'DETAIL' : 'DETAIL_EXPANDED')}
            >
              {detailExpanded ? '목록 펼치기' : '목록 접기'}
            </button>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
