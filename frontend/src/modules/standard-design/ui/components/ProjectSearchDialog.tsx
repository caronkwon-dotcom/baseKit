import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import FormModal from '../../../../components/common/FormModal';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import type { DesignProject } from '../../design-lifecycle/designLifecycle.types';
import { emptyProjectSearchCondition, type ProjectSearchCondition, type ProjectSearchResult } from './projectReference';

interface ProjectSearchDialogProps {
  initialResult: ProjectSearchResult;
  fields: SearchFieldConfig<ProjectSearchCondition>[];
  onSearch: (condition: ProjectSearchCondition) => ProjectSearchResult;
  onClose: () => void;
  onSelect: (project: DesignProject, result: ProjectSearchResult) => void;
}

const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

export default function ProjectSearchDialog({ initialResult, fields, onSearch, onClose, onSelect }: ProjectSearchDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [condition, setCondition] = useState(() => ({ ...initialResult.condition }));
  const [result, setResult] = useState(initialResult);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);

  const search = (nextCondition: ProjectSearchCondition) => {
    try {
      setResult(onSearch(nextCondition));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '프로젝트를 조회하지 못했습니다.');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      const controls = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) {
      event.preventDefault();
      search(condition);
    }
  };

  const select = (project: DesignProject) => { if (!error) onSelect(project, result); };
  const columns: DataTableColumn<DesignProject>[] = [
    { key: 'id', header: 'ID', render: (project) => project.PROJECT_ID, width: 76 },
    { key: 'name', header: '프로젝트명', minWidth: 130, flex: 2, render: (project) => (
      <button type="button" className="standard-design-project-link" title={project.PROJECT_NAME} disabled={Boolean(error)}
        onClick={(event) => { event.stopPropagation(); select(project); }}>{project.PROJECT_NAME}</button>
    ) },
    { key: 'customer', header: '고객명', render: (project) => project.CUSTOMER_NAME, minWidth: 90, flex: 1.4 },
    { key: 'status', header: '상태', render: (project) => project.STATUS, width: 76, align: 'center' },
  ];

  return (
    <div ref={rootRef} className="project-search-modal" onKeyDown={handleKeyDown}>
      <FormModal open title="프로젝트 검색" onClose={onClose}>
        <SearchPanel rows={1} fields={fields} value={condition} initialValue={emptyProjectSearchCondition}
          onValueChange={setCondition} onSearch={search} onReset={search} />
        {error ? <p className="page-message error" role="alert">ⓧ {error}</p> : null}
        <DataTable title={`검색 결과 (${result.rows.length}건)`} columns={columns} rows={result.rows}
          getRowKey={(project) => project.PROJECT_ID} onRowClick={select}
          emptyMessage="검색 조건에 맞는 프로젝트가 없습니다." />
      </FormModal>
    </div>
  );
}
