import { useState } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import FormModal from '../../../../components/common/FormModal';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import type { DesignProject, DesignStatus } from '../../design-lifecycle/designLifecycle.types';
import { emptyProjectSearchCondition, filterProjects, type ProjectSearchCondition } from './projectReference';
import { useProjectContext } from './useProjectContext';

const statuses: DesignStatus[] = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'];
const fields: SearchFieldConfig<ProjectSearchCondition>[] = [
  { key: 'PROJECT_NAME', label: '프로젝트명' },
  { key: 'CUSTOMER_NAME', label: '고객명' },
  { key: 'STATUS', label: '상태', controlType: 'select', options: [{ value: '', label: '전체' }, ...statuses.map((value) => ({ value, label: value }))] },
];
const columns: DataTableColumn<DesignProject>[] = [
  { key: 'id', header: 'ID', render: (row) => row.PROJECT_ID, width: 95 },
  { key: 'name', header: '프로젝트명', render: (row) => row.PROJECT_NAME, minWidth: 160, flex: 1.5 },
  { key: 'customer', header: '고객', render: (row) => row.CUSTOMER_NAME, minWidth: 120, flex: 1 },
  { key: 'status', header: '상태', render: (row) => row.STATUS, width: 110 },
];

export function ProjectContextDialog({ onClose, onSelected, onOpenProjectManagement }: { onClose: () => void; onSelected?: (project: DesignProject) => void; onOpenProjectManagement?: () => void }) {
  const [condition, setCondition] = useState(emptyProjectSearchCondition);
  const [applied, setApplied] = useState(emptyProjectSearchCondition);
  const rows = filterProjects(designLifecycleRepository.getData().projects, applied);
  const select = (next: DesignProject) => {
    designLifecycleRepository.setSelectedProjectId(next.PROJECT_ID);
    onSelected?.(next);
    onClose();
  };
  return <div className="sd-project-selector-modal">
      <FormModal open title="프로젝트 선택" onClose={onClose}>
        <SearchPanel rows={1} fields={fields} value={condition} initialValue={emptyProjectSearchCondition} onValueChange={setCondition}
          onSearch={setApplied} onReset={(next) => { setCondition(next); setApplied(next); }} />
        <DataTable title={`검색 결과 (${rows.length}건)`} columns={columns} rows={rows} getRowKey={(row) => row.PROJECT_ID}
          onRowClick={select} emptyMessage="선택할 수 있는 프로젝트가 없습니다." />
        {!rows.length ? <div className="sd-project-empty-help"><p>먼저 프로젝트 관리에서 프로젝트 기본정보를 등록하세요.</p>{onOpenProjectManagement ? <button type="button" className="primary-button" onClick={onOpenProjectManagement}>프로젝트 관리 열기</button> : null}</div> : null}
      </FormModal>
    </div>;
}

export default function ProjectContextSelector() {
  const { project } = useProjectContext();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="sd-project-context-selector" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M3 9h18" /></svg>
      <strong>{project ? `${project.PROJECT_ID} | ${project.PROJECT_NAME}` : '프로젝트 선택'}</strong>
      <span aria-hidden="true">▾</span>
    </button>
    {open ? <ProjectContextDialog onClose={() => setOpen(false)} /> : null}
  </>;
}
