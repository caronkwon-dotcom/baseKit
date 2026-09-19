import { useState } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import type { DesignProject } from '../../design-lifecycle/designLifecycle.types';
import { filterProjects, type ProjectSearchCondition } from './projectReference';

interface ProjectSearchDialogProps {
  projects: DesignProject[];
  initialCondition: ProjectSearchCondition;
  fields: SearchFieldConfig<ProjectSearchCondition>[];
  onClose: () => void;
  onSelect: (project: DesignProject, resultRows: DesignProject[], condition: ProjectSearchCondition) => void;
}

export default function ProjectSearchDialog({
  projects,
  initialCondition,
  fields,
  onClose,
  onSelect,
}: ProjectSearchDialogProps) {
  const [condition, setCondition] = useState(initialCondition);
  const [resultRows, setResultRows] = useState(() => filterProjects(projects, initialCondition));

  const search = (nextCondition: ProjectSearchCondition) => {
    setCondition(nextCondition);
    setResultRows(filterProjects(projects, nextCondition));
  };

  const columns: DataTableColumn<DesignProject>[] = [
    { key: 'id', header: 'ID', render: (project) => project.PROJECT_ID, width: 76 },
    { key: 'name', header: '프로젝트명', render: (project) => project.PROJECT_NAME, minWidth: 130, flex: 2 },
    { key: 'customer', header: '고객명', render: (project) => project.CUSTOMER_NAME, minWidth: 90, flex: 1.4 },
    { key: 'status', header: '상태', render: (project) => project.STATUS, width: 76, align: 'center' },
  ];

  return (
    <div className="project-search-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="project-search-dialog" role="dialog" aria-modal="true" aria-labelledby="project-search-dialog-title">
        <div className="project-search-dialog__heading">
          <div>
            <h2 id="project-search-dialog-title">프로젝트 찾기</h2>
            <p>프로젝트명, 고객명, 상태로 Working Set을 바꿀 프로젝트를 찾습니다.</p>
          </div>
          <button type="button" className="search-icon-button" aria-label="프로젝트 찾기 닫기" title="닫기" onClick={onClose}>×</button>
        </div>
        <SearchPanel
          rows={1}
          fields={fields}
          value={condition}
          initialValue={initialCondition}
          onValueChange={setCondition}
          onSearch={search}
          onReset={search}
        />
        <DataTable
          title={`검색 결과 (${resultRows.length}건)`}
          columns={columns}
          rows={resultRows}
          getRowKey={(project) => project.PROJECT_ID}
          onRowClick={(project) => onSelect(project, resultRows, condition)}
          emptyMessage="검색 조건에 맞는 프로젝트가 없습니다."
        />
      </section>
    </div>
  );
}
