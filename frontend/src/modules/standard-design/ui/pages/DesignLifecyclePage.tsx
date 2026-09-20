import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import ActionButton from '../../../../components/common/ActionButton';
import MasterDetailMultiGrid from '../../../../components/common/MasterDetailMultiGrid';
import PageHeader from '../../../../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import { schemaCatalogRepository } from '../../../../features/system/tableManage/schemaCatalog.repository';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import type { DbColumnDefinition, DesignProject, DesignStatus, ScreenField } from '../../design-lifecycle/designLifecycle.types';
import {
  toProjectDraft, createEmptyProjectDraft, searchProjectSnapshot, saveToProjectWorkingSet,
  getNextProjectId, isProjectDraftDirty,
  type ProjectSearchCondition, type ProjectSearchResult, type ProjectEditor, type ProjectDraft, type ProjectMessageTone,
} from '../components/projectReference';
import ProjectListDetailWorkspace, { type ProjectWorkspaceMode } from '../components/ProjectListDetailWorkspace';
import ProjectSearchDialog from '../components/ProjectSearchDialog';

type LifecycleView = 'overview' | 'wbs' | 'requirements' | 'screens' | 'database';
type LifecycleItem = ReturnType<typeof getRows>[number];

const STATUS: DesignStatus[] = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'];
const labels: Record<LifecycleView, string> = { overview: '프로젝트 관리', wbs: 'WBS', requirements: '요구사항', screens: '화면 설계', database: 'DB 설계' };
const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(3, '0')}`;

function getRows(view: LifecycleView, projectId: string) {
  const data = designLifecycleRepository.getData();
  if (view === 'overview') return data.projects;
  if (view === 'wbs') return data.wbsItems.filter((item) => item.PROJECT_ID === projectId);
  if (view === 'requirements') return data.requirements.filter((item) => item.PROJECT_ID === projectId);
  if (view === 'screens') return data.screens.filter((item) => item.PROJECT_ID === projectId);
  return data.tables.filter((item) => item.PROJECT_ID === projectId);
}

function itemId(item: LifecycleItem) {
  if ('WBS_ID' in item) return item.WBS_ID;
  if ('REQUIREMENT_ID' in item) return item.REQUIREMENT_ID;
  if ('SCREEN_ID' in item) return item.SCREEN_ID;
  if ('TABLE_ID' in item) return item.TABLE_ID;
  return item.PROJECT_ID;
}

function itemName(item: LifecycleItem) {
  if ('WBS_NAME' in item) return item.WBS_NAME;
  if ('REQUIREMENT_NAME' in item) return item.REQUIREMENT_NAME;
  if ('SCREEN_NAME' in item) return item.SCREEN_NAME;
  if ('TABLE_NAME' in item) return item.LOGICAL_NAME;
  return item.PROJECT_NAME;
}

function parseDataType(dataType: string) {
  const match = /^(.*?)(?:\(([^,)]+)(?:,([^,)]+))?\))?$/.exec(dataType);
  return { type: match?.[1] ?? dataType, length: match?.[2] ?? '-', scale: match?.[3] ?? '-' };
}

function ScreenFieldGrid({ rows }: { rows: ScreenField[] }) {
  const columns: DataTableColumn<ScreenField>[] = [
      { key: 'name', header: '물리명', render: (row) => row.FIELD_NAME, minWidth: 110 },
      { key: 'logical', header: '논리명', render: (row) => row.LOGICAL_NAME, minWidth: 100 },
      { key: 'type', header: 'Datatype', render: (row) => row.DATA_TYPE, minWidth: 90 },
      { key: 'required', header: '필수', render: (row) => row.REQUIRED_YN, width: 56, align: 'center' },
      { key: 'description', header: '설명', render: (row) => row.DESCRIPTION, minWidth: 130 },
    ];
  return <section className="standard-design-lifecycle-detail-grid">
    <h2>화면 필드 <span>{rows.length}건</span></h2>
    <DataTable columns={columns} rows={rows} getRowKey={(row) => row.FIELD_ID} emptyMessage="등록된 화면 필드가 없습니다." />
  </section>;
}

function DbColumnGrid({ rows }: { rows: DbColumnDefinition[] }) {
  const columns: DataTableColumn<DbColumnDefinition>[] = [
      { key: 'name', header: '물리명', render: (row) => row.COLUMN_NAME, minWidth: 105 },
      { key: 'logical', header: '논리명', render: (row) => row.LOGICAL_NAME, minWidth: 95 },
      { key: 'domain', header: 'Domain', render: (row) => row.DOMAIN_NAME, minWidth: 80 },
      { key: 'type', header: 'Datatype', render: (row) => parseDataType(row.DATA_TYPE).type, minWidth: 75 },
      { key: 'length', header: 'Length', render: (row) => parseDataType(row.DATA_TYPE).length, width: 58, align: 'right' },
      { key: 'scale', header: 'Scale', render: (row) => parseDataType(row.DATA_TYPE).scale, width: 54, align: 'right' },
      { key: 'pk', header: 'PK', render: (row) => row.PK_YN, width: 44, align: 'center' },
      { key: 'nullable', header: 'Nullable', render: (row) => row.NULLABLE_YN, width: 68, align: 'center' },
      { key: 'description', header: '설명', render: (row) => row.DESCRIPTION, minWidth: 115 },
    ];
  return <section className="standard-design-lifecycle-detail-grid">
    <h2>테이블 컬럼 <span>{rows.length}건</span></h2>
    <DataTable columns={columns} rows={rows} getRowKey={(row) => row.COLUMN_ID} emptyMessage="등록된 테이블 컬럼이 없습니다." />
  </section>;
}

interface ProjectMessage {
  tone: ProjectMessageTone;
  text: string;
}

const initialProjectSearchCondition: ProjectSearchCondition = {
  PROJECT_NAME: '',
  CUSTOMER_NAME: '',
  STATUS: '',
};

const projectSearchFields: SearchFieldConfig<ProjectSearchCondition>[] = [
  { key: 'PROJECT_NAME', label: '프로젝트명', placeholder: '프로젝트명' },
  { key: 'CUSTOMER_NAME', label: '고객명', placeholder: '고객명' },
  {
    key: 'STATUS',
    label: '상태',
    controlType: 'select',
    options: [
      { value: '', label: '전체' },
      ...STATUS.map((status) => ({ value: status, label: status })),
    ],
  },
];

function ProjectMessageIcon({ tone }: { tone: ProjectMessageTone }) {
  if (tone === 'success') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
  if (tone === 'error') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 9 6 6m0-6-6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
  if (tone === 'warning') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5m0 3h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}

function ProjectMessageBanner({ message }: { message: ProjectMessage }) {
  return (
    <div className={`page-message standard-design-project-message ${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
      <ProjectMessageIcon tone={message.tone} />
      <span>{message.text}</span>
    </div>
  );
}

function ProjectManagementPage() {
  const [workspaceMode, setWorkspaceMode] = useState<ProjectWorkspaceMode>('LIST');
  const [workingSet, setWorkingSet] = useState(() => designLifecycleRepository.getData().projects);
  const [selectedProjectId, setSelectedProjectId] = useState(() => designLifecycleRepository.getSelectedProjectId());
  const [searchCondition, setSearchCondition] = useState<ProjectSearchCondition>(initialProjectSearchCondition);
  const [appliedCondition, setAppliedCondition] = useState<ProjectSearchCondition>(initialProjectSearchCondition);
  const [editor, setEditor] = useState<ProjectEditor | null>(null);
  const [message, setMessage] = useState<ProjectMessage | null>(null);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const activeProject = editor?.mode === 'EDIT'
    ? workingSet.find((project) => project.PROJECT_ID === editor.sourceProjectId)
    : undefined;
  const hasUnsavedChanges = isProjectDraftDirty(editor);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [hasUnsavedChanges]);

  const confirmDiscardChanges = () => !hasUnsavedChanges || window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 계속하시겠습니까?');

  const openProjectDetail = (project: DesignProject) => {
    if (editor?.mode === 'EDIT' && editor.sourceProjectId === project.PROJECT_ID) {
      setSelectedProjectId(project.PROJECT_ID);
      setWorkspaceMode('DETAIL');
      return;
    }
    if (!confirmDiscardChanges()) return;

    const draft = toProjectDraft(project);
    designLifecycleRepository.setSelectedProjectId(project.PROJECT_ID);
    setSelectedProjectId(project.PROJECT_ID);
    setEditor({ mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: draft, draft });
    setWorkspaceMode('DETAIL');
    setMessage(null);
  };

  const selectProject = (project: DesignProject) => {
    if (workspaceMode !== 'LIST') {
      openProjectDetail(project);
      return;
    }
    setSelectedProjectId(project.PROJECT_ID);
  };

  const createProject = () => {
    if (!confirmDiscardChanges()) return;

    const draft = createEmptyProjectDraft();
    setSelectedProjectId('');
    setEditor({ mode: 'NEW', initialDraft: draft, draft });
    setWorkspaceMode('DETAIL');
    setMessage(null);
  };

  const copyProject = () => {
    if (!activeProject || !confirmDiscardChanges()) return;

    const draft = toProjectDraft(activeProject);
    setEditor({ mode: 'COPY', initialDraft: draft, draft });
    setWorkspaceMode('DETAIL');
    setMessage(null);
  };

  const openProjectSearch = () => setProjectSearchOpen(true);

  const selectProjectFromSearch = (project: DesignProject, result: ProjectSearchResult) => {
    if (!confirmDiscardChanges()) return;
    const draft = toProjectDraft(project);
    designLifecycleRepository.setSelectedProjectId(project.PROJECT_ID);
    setWorkingSet(result.rows);
    setSearchCondition(result.condition);
    setAppliedCondition(result.condition);
    setSelectedProjectId(project.PROJECT_ID);
    setEditor({ mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: draft, draft });
    setWorkspaceMode('DETAIL');
    setProjectSearchOpen(false);
    setMessage(null);
  };

  const returnToList = () => {
    if (!confirmDiscardChanges()) return;

    setEditor(null);
    setWorkspaceMode('LIST');
    setMessage(null);
  };

  const updateDraft = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setEditor((currentEditor) => currentEditor
      ? { ...currentEditor, draft: { ...currentEditor.draft, [key]: value } }
      : currentEditor);
  };

  const runSearch = (condition: ProjectSearchCondition) => {
    try {
      const result = searchProjectSnapshot(designLifecycleRepository.getData().projects, condition);
      setWorkingSet(result.rows);
      setAppliedCondition(result.condition);
      setMessage(result.rows.length === 0
        ? { tone: 'warning', text: '조회 조건에 맞는 프로젝트가 없습니다. 조건을 조정한 후 다시 조회하세요.' }
        : null);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트 목록을 조회하지 못했습니다.' });
    }
  };

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;

    const draft = {
      ...editor.draft,
      PROJECT_NAME: editor.draft.PROJECT_NAME.trim(),
      CUSTOMER_NAME: editor.draft.CUSTOMER_NAME.trim(),
      DESCRIPTION: editor.draft.DESCRIPTION.trim(),
    };

    if (!draft.PROJECT_NAME || !draft.CUSTOMER_NAME) {
      setMessage({ tone: 'error', text: '프로젝트명과 고객명은 필수입니다.' });
      return;
    }

    try {
      const projectId = editor.mode === 'EDIT' ? editor.sourceProjectId : getNextProjectId(designLifecycleRepository.getData().projects);
      if (!projectId) throw new Error('저장할 프로젝트 식별자를 찾지 못했습니다.');

      const project: DesignProject = { PROJECT_ID: projectId, ...draft };
      designLifecycleRepository.saveProject(project);
      designLifecycleRepository.setSelectedProjectId(projectId);
      setWorkingSet((rows) => saveToProjectWorkingSet(rows, project));
      setSelectedProjectId(projectId);
      setEditor({ mode: 'EDIT', sourceProjectId: projectId, initialDraft: toProjectDraft(project), draft: toProjectDraft(project) });
      setWorkspaceMode('DETAIL');
      setMessage({ tone: 'success', text: `${project.PROJECT_NAME} 프로젝트를 저장했습니다.` });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트를 저장하지 못했습니다.' });
    }
  };

  const deleteProject = () => {
    if (!activeProject) {
      setMessage({ tone: 'error', text: '삭제할 저장 프로젝트를 먼저 선택하세요.' });
      return;
    }
    if (!window.confirm(`${activeProject.PROJECT_NAME} 프로젝트를 삭제하시겠습니까?`)) return;

    try {
      designLifecycleRepository.deleteItem('projects', activeProject.PROJECT_ID);
      const nextRows = workingSet.filter((project) => project.PROJECT_ID !== activeProject.PROJECT_ID);
      const nextProjectId = nextRows[0]?.PROJECT_ID ?? '';
      designLifecycleRepository.setSelectedProjectId(nextProjectId);
      setWorkingSet(nextRows);
      setSelectedProjectId(nextProjectId);
      setEditor(null);
      setWorkspaceMode('LIST');
      setMessage({ tone: 'success', text: `${activeProject.PROJECT_NAME} 프로젝트를 삭제했습니다.` });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트를 삭제하지 못했습니다.' });
    }
  };

  const projectColumns: DataTableColumn<DesignProject>[] = [
    { key: 'id', header: 'ID', render: (project) => project.PROJECT_ID, width: 76 },
    {
      key: 'name',
      header: '프로젝트명',
      render: (project) => (
        <button
          type="button"
          className="standard-design-project-link"
          title={project.PROJECT_NAME}
          onClick={(event) => {
            event.stopPropagation();
            openProjectDetail(project);
          }}
        >
          {project.PROJECT_NAME}
        </button>
      ),
      minWidth: 112,
      flex: 2.4,
    },
    { key: 'customer', header: '고객명', render: (project) => project.CUSTOMER_NAME, minWidth: 76, flex: 1.4 },
    { key: 'status', header: '상태', render: (project) => project.STATUS, width: 64, align: 'center' },
  ];

  const editorTitle = editor?.mode === 'EDIT'
    ? '프로젝트 상세'
    : editor?.mode === 'COPY'
      ? '신규 등록 (복사)'
      : '신규 등록';
  const editorDescription = editor?.mode === 'EDIT'
    ? ''
    : editor?.mode === 'COPY'
      ? '프로젝트명, 고객명, 설명, 상태만 복사했습니다. 저장 시 새 프로젝트가 생성됩니다.'
      : '저장 시 새 프로젝트 ID가 생성됩니다.';
  return <div className="page standard-design-page standard-design-lifecycle-page standard-design-project-page">
    <PageHeader breadcrumbs={['Standard Design', '프로젝트 관리']} />
    <ProjectListDetailWorkspace
      mode={workspaceMode}
      onModeChange={setWorkspaceMode}
      list={<div className="project-list-detail-workspace__list-content">
        <div className="project-list-pane-actions">
          {workspaceMode === 'LIST' ? (
            <ActionButton actionCode="CREATE" label="신규" tone="primary" onClick={createProject} />
          ) : (
            <>
              <ActionButton actionCode="SEARCH" label="검색" tone="primary" onClick={openProjectSearch} />
              <button type="button" className="secondary-button" onClick={returnToList}>목록으로</button>
            </>
          )}
        </div>
        {workspaceMode === 'LIST' ? (
          <SearchPanel
            rows={1}
            fields={projectSearchFields}
            value={searchCondition}
            initialValue={initialProjectSearchCondition}
            onValueChange={setSearchCondition}
            onSearch={runSearch}
            onReset={runSearch}
          />
        ) : null}
        <DataTable
          title={`프로젝트 목록 (${workingSet.length}건)`}
          columns={projectColumns}
          rows={workingSet}
          getRowKey={(project) => project.PROJECT_ID}
          onRowClick={selectProject}
          getRowClassName={(project) => project.PROJECT_ID === selectedProjectId ? 'selected-row' : ''}
          emptyMessage="조회 조건에 맞는 프로젝트가 없습니다."
        />
      </div>}
      detail={editor ? (
        <>
          <div className="standard-design-project-detail-actions" aria-label="프로젝트 상세 기능">
            <ActionButton actionCode="CREATE" label="신규" tone="primary" onClick={createProject} />
            <ActionButton actionCode="CREATE" label="복사" onClick={copyProject} disabled={!activeProject} />
            <button type="submit" form="project-detail-form" className="primary-button" data-action-code={editor.mode === 'EDIT' ? 'UPDATE' : 'CREATE'}>저장</button>
            <ActionButton actionCode="DELETE" label="삭제" tone="danger" onClick={deleteProject} disabled={!activeProject} />
          </div>
        <form id="project-detail-form" className="standard-design-lifecycle-form standard-design-project-form" noValidate onSubmit={saveProject}>
          <div className="standard-design-project-detail-heading">
            <div>
              <div className="standard-design-project-title-row">
                <h2>{editorTitle}</h2>
                {editor.mode !== 'EDIT' ? <span className="standard-design-project-editor-state">{editor.mode === 'COPY' ? 'COPY' : 'NEW'}</span> : null}
              </div>
              {editorDescription ? <p>{editorDescription}</p> : null}
            </div>
            <dl className="standard-design-project-id">
              <div>
                <dt>ID</dt>
                <dd>{editor.mode === 'EDIT' ? editor.sourceProjectId : '신규 저장 시 생성'}</dd>
              </div>
            </dl>
          </div>
          <div className="standard-design-project-fields">
            <label><span>프로젝트명</span><input name="PROJECT_NAME" required value={editor.draft.PROJECT_NAME} onChange={(event) => updateDraft('PROJECT_NAME', event.target.value)} /></label>
            <label><span>고객명</span><input name="CUSTOMER_NAME" required value={editor.draft.CUSTOMER_NAME} onChange={(event) => updateDraft('CUSTOMER_NAME', event.target.value)} /></label>
            <label><span>상태</span><select name="STATUS" value={editor.draft.STATUS} onChange={(event) => updateDraft('STATUS', event.target.value as DesignStatus)}>{STATUS.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="standard-design-project-description"><span>설명</span><textarea name="DESCRIPTION" rows={5} value={editor.draft.DESCRIPTION} onChange={(event) => updateDraft('DESCRIPTION', event.target.value)} /></label>
          </div>
        </form>
        </>
      ) : null}
    />
    {message ? <ProjectMessageBanner message={message} /> : null}
    {projectSearchOpen ? <ProjectSearchDialog
      initialResult={{ rows: workingSet, condition: appliedCondition }}
      onSearch={(condition) => searchProjectSnapshot(designLifecycleRepository.getData().projects, condition)}
      fields={projectSearchFields}
      onClose={() => setProjectSearchOpen(false)}
      onSelect={selectProjectFromSearch}
    /> : null}
  </div>;
}

function LifecycleDetailPage({ view, supplement }: { view: LifecycleView; supplement?: ReactNode }) {
  const [, setRevision] = useState(0);
  const [projectId, setProjectId] = useState(designLifecycleRepository.getSelectedProjectId());
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('목록에서 대상을 선택하거나 신규 등록을 시작하세요.');
  const data = designLifecycleRepository.getData();
  const project = data.projects.find((item) => item.PROJECT_ID === projectId);
  const rows = getRows(view, projectId);
  const selected = rows.find((item) => itemId(item) === selectedId);
  const refresh = () => setRevision((value) => value + 1);
  const changeProject = (value: string) => {
    designLifecycleRepository.setSelectedProjectId(value);
    setProjectId(value);
    setSelectedId('');
    setMessage('프로젝트 Context를 변경했습니다. 이후 Lifecycle 화면에서도 유지됩니다.');
  };
  const create = () => {
    setSelectedId('');
    setMessage('신규 등록 모드입니다. 필수 항목을 입력한 후 저장하세요.');
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view !== 'overview' && !projectId) {
      setMessage('프로젝트 Context를 먼저 선택하세요.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const status = form.get('STATUS') as DesignStatus;
    if (view === 'overview') {
      const id = selectedId || nextId('SDP', data.projects.length);
      designLifecycleRepository.saveProject({ PROJECT_ID: id, PROJECT_NAME: String(form.get('NAME')).trim(), CUSTOMER_NAME: String(form.get('CUSTOMER_NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status });
      if (!projectId) changeProject(id);
    }
    if (view === 'wbs') designLifecycleRepository.saveWbs({ WBS_ID: selectedId || nextId('WBS', data.wbsItems.length), PROJECT_ID: projectId, PARENT_WBS_ID: String(form.get('PARENT_WBS_ID')) || null, WBS_NAME: String(form.get('NAME')).trim(), WBS_LEVEL: Number(form.get('WBS_LEVEL')), STATUS: status });
    if (view === 'requirements') designLifecycleRepository.saveRequirement({ REQUIREMENT_ID: selectedId || nextId('REQ', data.requirements.length), PROJECT_ID: projectId, REQUIREMENT_NAME: String(form.get('NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, WBS_IDS: String(form.get('WBS_IDS')).split(',').map((value) => value.trim()).filter(Boolean), SCREEN_IDS: String(form.get('SCREEN_IDS')).split(',').map((value) => value.trim()).filter(Boolean), TABLE_IDS: String(form.get('TABLE_IDS')).split(',').map((value) => value.trim()).filter(Boolean) });
    if (view === 'screens') designLifecycleRepository.saveScreen({ SCREEN_ID: selectedId || nextId('SCR', data.screens.length), PROJECT_ID: projectId, SCREEN_NAME: String(form.get('NAME')).trim(), SCREEN_TYPE: form.get('SCREEN_TYPE') as 'LIST' | 'DETAIL' | 'POPUP', DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, FIELDS: selected && 'FIELDS' in selected ? selected.FIELDS : [] });
    if (view === 'database') designLifecycleRepository.saveTable({ TABLE_ID: selectedId || nextId('TBL', data.tables.length), PROJECT_ID: projectId, TABLE_NAME: String(form.get('NAME')).trim(), LOGICAL_NAME: String(form.get('LOGICAL_NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, CATALOG_TABLE_KEY: String(form.get('CATALOG_TABLE_KEY')) || undefined, COLUMNS: selected && 'COLUMNS' in selected ? selected.COLUMNS : [] });
    setMessage(`${labels[view]} 정보를 저장했습니다.`);
    refresh();
  };
  const remove = () => {
    if (!selectedId) {
      setMessage('삭제할 대상을 먼저 선택하세요.');
      return;
    }
    const type = view === 'overview' ? 'projects' : view === 'wbs' ? 'wbsItems' : view === 'requirements' ? 'requirements' : view === 'screens' ? 'screens' : 'tables';
    designLifecycleRepository.deleteItem(type, selectedId);
    if (view === 'overview' && selectedId === projectId) {
      const nextProjectId = data.projects.find((item) => item.PROJECT_ID !== selectedId)?.PROJECT_ID ?? '';
      designLifecycleRepository.setSelectedProjectId(nextProjectId);
      setProjectId(nextProjectId);
    }
    setSelectedId('');
    setMessage(`${labels[view]} 정보를 삭제했습니다.`);
    refresh();
  };
  const columns: DataTableColumn<LifecycleItem>[] = [
    { key: 'id', header: 'ID', render: itemId, minWidth: 95 },
    { key: 'name', header: '명칭', render: itemName, minWidth: 130 },
    ...(view === 'wbs' ? [{ key: 'level', header: '레벨', render: (item: LifecycleItem) => 'WBS_LEVEL' in item ? item.WBS_LEVEL : '-', width: 56, align: 'center' as const }] : []),
    { key: 'status', header: '상태', render: (item) => item.STATUS, width: 90, align: 'center' },
  ];
  const relatedWbs = data.wbsItems.filter((item) => item.PROJECT_ID === projectId);

  const linkPanel = view === 'requirements' && selected && 'WBS_IDS' in selected
    ? <section className="standard-design-traceability"><h2>요구사항 추적성</h2><span>연결 WBS: {selected.WBS_IDS.join(', ') || '-'}</span><span>연결 화면: {selected.SCREEN_IDS.join(', ') || '-'}</span><span>연결 테이블: {selected.TABLE_IDS.join(', ') || '-'}</span></section>
    : view === 'screens' && selected && 'FIELDS' in selected
      ? <ScreenFieldGrid rows={selected.FIELDS} />
      : view === 'database' && selected && 'COLUMNS' in selected
        ? <DbColumnGrid rows={selected.COLUMNS} />
        : <section className="standard-design-lifecycle-guide"><h2>{view === 'wbs' ? '계층 WBS' : '상세 정보'}</h2><p>{view === 'wbs' ? '상위 WBS와 레벨을 지정하면 프로젝트 범위 안에서 계층 구조를 관리합니다.' : '목록에서 대상을 선택하면 관련 상세 정보가 표시됩니다.'}</p>{supplement}</section>;

  return <div className="page standard-design-page standard-design-lifecycle-page">
    <PageHeader breadcrumbs={['Standard Design', labels[view]]} description="프로젝트 Context를 유지하며 설계 산출물과 요구사항 추적성을 관리합니다." />
    <section className="standard-design-lifecycle-toolbar" aria-label={`${labels[view]} 기능`}>
      {view === 'overview' ? <label>프로젝트<select value={projectId} onChange={(event) => changeProject(event.target.value)}>{data.projects.map((item) => <option key={item.PROJECT_ID} value={item.PROJECT_ID}>{item.PROJECT_NAME}</option>)}</select></label> : <span className="standard-design-project-context">Project Context: <strong>{project?.PROJECT_NAME ?? '프로젝트 없음'}</strong></span>}
      <div className="standard-design-lifecycle-actions"><button type="button" className="secondary-button" data-action-code="SEARCH" onClick={() => { refresh(); setMessage('목록을 조회했습니다.'); }}>조회</button><button type="button" className="primary-button" data-action-code="CREATE" onClick={create}>등록</button><button type="submit" form="lifecycle-detail-form" className="primary-button" data-action-code="UPDATE">저장</button><button type="button" className="danger-button" data-action-code="DELETE" onClick={remove}>삭제</button></div>
    </section>
    <MasterDetailMultiGrid
      master={<DataTable title={`${labels[view]} 목록 (${rows.length}건)`} columns={columns} rows={rows} getRowKey={itemId} onRowClick={(item) => { setSelectedId(itemId(item)); setMessage(`${itemName(item)} 상세 정보를 불러왔습니다.`); }} selectedRowKeys={selectedId ? new Set([selectedId]) : new Set()} onSelectedRowKeysChange={(keys) => setSelectedId([...keys][0] ?? '')} emptyMessage="현재 Project Context에 등록된 항목이 없습니다." />}
      detailTop={<form id="lifecycle-detail-form" key={selectedId || 'new'} className="standard-design-lifecycle-form" onSubmit={save}><h2>{selected ? '상세 수정' : '신규 등록'}</h2><label>명칭<input name="NAME" required defaultValue={selected ? itemName(selected) : ''} /></label>{view === 'overview' ? <label>고객명<input name="CUSTOMER_NAME" required defaultValue={selected && 'CUSTOMER_NAME' in selected ? selected.CUSTOMER_NAME : ''} /></label> : null}{view === 'wbs' ? <><label>상위 WBS<select name="PARENT_WBS_ID" defaultValue={selected && 'PARENT_WBS_ID' in selected ? selected.PARENT_WBS_ID ?? '' : ''}><option value="">없음</option>{relatedWbs.filter((item) => item.WBS_ID !== selectedId).map((item) => <option key={item.WBS_ID} value={item.WBS_ID}>{item.WBS_NAME}</option>)}</select></label><label>레벨<input name="WBS_LEVEL" type="number" min="1" required defaultValue={selected && 'WBS_LEVEL' in selected ? selected.WBS_LEVEL : 1} /></label></> : null}{view === 'screens' ? <label>화면 유형<select name="SCREEN_TYPE" defaultValue={selected && 'SCREEN_TYPE' in selected ? selected.SCREEN_TYPE : 'LIST'}><option>LIST</option><option>DETAIL</option><option>POPUP</option></select></label> : null}{view === 'database' ? <><label>논리명<input name="LOGICAL_NAME" required defaultValue={selected && 'LOGICAL_NAME' in selected ? selected.LOGICAL_NAME : ''} /></label><label>Schema Catalog 참조<select name="CATALOG_TABLE_KEY" defaultValue={selected && 'CATALOG_TABLE_KEY' in selected ? selected.CATALOG_TABLE_KEY ?? '' : ''}><option value="">미지정</option>{schemaCatalogRepository.getTables().map((item) => <option key={item.tableKey} value={item.tableKey}>{item.logicalName} ({item.physicalName})</option>)}</select></label></> : null}{view === 'requirements' ? <><label>연결 WBS ID<input name="WBS_IDS" defaultValue={selected && 'WBS_IDS' in selected ? selected.WBS_IDS.join(', ') : ''} placeholder="WBS-001, WBS-002" /></label><label>연결 화면 ID<input name="SCREEN_IDS" defaultValue={selected && 'SCREEN_IDS' in selected ? selected.SCREEN_IDS.join(', ') : ''} placeholder="SCR-001" /></label><label>연결 테이블 ID<input name="TABLE_IDS" defaultValue={selected && 'TABLE_IDS' in selected ? selected.TABLE_IDS.join(', ') : ''} placeholder="TBL-001" /></label></> : null}<label>설명<textarea name="DESCRIPTION" rows={2} defaultValue={selected && 'DESCRIPTION' in selected ? selected.DESCRIPTION : ''} /></label><label>상태<select name="STATUS" defaultValue={selected?.STATUS ?? 'DRAFT'}>{STATUS.map((item) => <option key={item}>{item}</option>)}</select></label></form>}
      detailBottom={linkPanel}
      message={message}
    />
  </div>;
}

export default function DesignLifecyclePage({ view, supplement }: { view: LifecycleView; supplement?: ReactNode }) {
  return view === 'overview'
    ? <ProjectManagementPage />
    : <LifecycleDetailPage view={view} supplement={supplement} />;
}
