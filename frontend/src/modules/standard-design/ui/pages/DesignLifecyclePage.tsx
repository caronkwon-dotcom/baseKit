import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import ActionButton from '../../../../components/common/ActionButton';
import MasterDetailMultiGrid from '../../../../components/common/MasterDetailMultiGrid';
import PageHeader from '../../../../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../../../../components/common/SearchPanel';
import { schemaCatalogRepository } from '../../../../features/system/tableManage/schemaCatalog.repository';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import { ProjectApiError, projectApi } from '../../projects/projectApi';
import { getProjectStatus, getProjects, hasLoadedProjects, loadProjects, removeProjectFromCache, upsertProject } from '../../projects/projectStore';
import { initialSelection, selectionAfterDelete, type ProjectSelection } from '../../projects/projectManagement';
import type { DbColumnDefinition, DesignProject, DesignStatus, ScreenField, DesignMember, ProjectMember } from '../../design-lifecycle/designLifecycle.types';
import {
  toProjectDraft, createEmptyProjectDraft, searchProjectSnapshot, saveToProjectWorkingSet,
  isProjectDraftDirty, getEditorProject, getAppliedSearchDescription,
  type ProjectSearchCondition, type ProjectEditor, type ProjectDraft, type ProjectMessageTone,
} from '../components/projectReference';
import ProjectListDetailWorkspace, { type ProjectWorkspaceMode } from '../components/ProjectListDetailWorkspace';
import FormField from '../../../../components/common/FormField';
import RequiredFieldsNotice from '../../../../components/common/RequiredFieldsNotice';
import ProjectMemberDialog from '../components/ProjectMemberDialog';
import ProjectContextSelector from '../components/ProjectContextSelector';
import { validateProjectDates } from '../components/projectContext';
import { useProjectContext } from '../components/useProjectContext';

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

const editorFor = (project: DesignProject): ProjectEditor => {
  const draft = toProjectDraft(project);
  return { mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: draft, draft };
};
const newEditor = (): ProjectEditor => { const draft = createEmptyProjectDraft(); return { mode: 'NEW', initialDraft: draft, draft }; };
const editorForSelection = (selection: ProjectSelection, rows: DesignProject[]): ProjectEditor | null => {
  if (selection.kind === 'NEW') return newEditor();
  if (selection.kind !== 'EDIT') return null;
  const project = rows.find((item) => item.PROJECT_ID === selection.projectId);
  return project ? editorFor(project) : null;
};
/** 2026-11-01 ~ 2027-03-31; a missing date shows as a dash and no dates at all as a single dash. */
const projectPeriod = (project: DesignProject) => project.START_DATE || project.END_DATE ? `${project.START_DATE || '-'} ~ ${project.END_DATE || '-'}` : '-';

function ProjectManagementPage() {
  // The screen opens straight into list + detail: no full-width list first (the mode only toggles the list collapse now).
  const [workspaceMode, setWorkspaceMode] = useState<ProjectWorkspaceMode>('DETAIL');
  const { status: projectStatus, error: projectError } = useProjectContext();
  const [first] = useState(() => {
    const rows = getProjects();
    const selection = initialSelection(getProjectStatus(), rows, designLifecycleRepository.getSelectedProjectId());
    return { rows, selection, editor: editorForSelection(selection, rows) };
  });
  const [workingSet, setWorkingSet] = useState(first.rows);
  const [busy, setBusy] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(first.selection.kind === 'EDIT' ? first.selection.projectId : '');
  const [searchCondition, setSearchCondition] = useState<ProjectSearchCondition>(initialProjectSearchCondition);
  const [appliedCondition, setAppliedCondition] = useState<ProjectSearchCondition>(initialProjectSearchCondition);
  const [editor, setEditor] = useState<ProjectEditor | null>(first.editor);
  const [message, setMessage] = useState<ProjectMessage | null>(null);
  const [projectSearchOpen, setProjectSearchOpen] = useState(true);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingProjectMember, setEditingProjectMember] = useState<ProjectMember | undefined>();
  const [selectedProjectMemberId, setSelectedProjectMemberId] = useState('');
  const activeProject = getEditorProject(editor);
  const hasUnsavedChanges = isProjectDraftDirty(editor);
  const versionOf = (projectId: string) => getProjects().find((project) => project.PROJECT_ID === projectId)?.VERSION;

  /** Reads the server list again and re-applies the executed search; saves keep the working set (see saveToProjectWorkingSet). */
  const refreshList = async () => {
    await loadProjects();
    setWorkingSet(searchProjectSnapshot(getProjects(), appliedCondition).rows);
  };

  // The project context follows the screen's selection (the first row becomes the context when none was chosen).
  useEffect(() => {
    if (first.selection.kind === 'EDIT' && designLifecycleRepository.getSelectedProjectId() !== first.selection.projectId) designLifecycleRepository.setSelectedProjectId(first.selection.projectId);
  }, [first.selection]);

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
      return true;
    }
    if (!confirmDiscardChanges()) return false;

    const draft = toProjectDraft(project);
    setSelectedProjectId(project.PROJECT_ID);
    designLifecycleRepository.setSelectedProjectId(project.PROJECT_ID);
    setEditor({ mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: draft, draft });
    setSelectedProjectMemberId('');
    setWorkspaceMode('DETAIL');
    setMessage(null);
    return true;
  };

  const selectProject = (project: DesignProject) => {
    openProjectDetail(project);
  };

  const createProject = () => {
    if (!confirmDiscardChanges()) return;

    const draft = createEmptyProjectDraft();
    setSelectedProjectId('');
    setEditor({ mode: 'NEW', initialDraft: draft, draft });
    setSelectedProjectMemberId('');
    setWorkspaceMode('DETAIL');
    setMessage(null);
  };

  const copyProject = () => {
    if (!activeProject || !confirmDiscardChanges()) return;

    const draft = toProjectDraft(activeProject);
    setEditor({ mode: 'COPY', initialDraft: draft, draft });
    setSelectedProjectMemberId('');
    setWorkspaceMode('DETAIL');
    setMessage(null);
  };

  const updateDraft = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setEditor((currentEditor) => currentEditor
      ? { ...currentEditor, draft: { ...currentEditor.draft, [key]: value } }
      : currentEditor);
  };

  const runSearch = (condition: ProjectSearchCondition) => {
    try {
      const result = searchProjectSnapshot(getProjects(), condition);
      setWorkingSet(result.rows);
      setAppliedCondition(result.condition);
      setMessage(result.rows.length === 0
        ? { tone: 'warning', text: '조회 조건에 맞는 프로젝트가 없습니다. 조건을 조정한 후 다시 조회하세요.' }
        : null);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트 목록을 조회하지 못했습니다.' });
    }
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;

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
    const dateError = validateProjectDates(draft.START_DATE, draft.END_DATE);
    if (dateError) { setMessage({ tone: 'error', text: dateError }); return; }

    setBusy(true);
    try {
      let project: DesignProject;
      if (editor.mode === 'EDIT') {
        const version = editor.sourceProjectId ? versionOf(editor.sourceProjectId) : undefined;
        if (!editor.sourceProjectId || version === undefined) throw new Error('최신 프로젝트 정보를 조회한 후 다시 저장하세요.');
        project = await projectApi.update(editor.sourceProjectId, draft, version);
      } else {
        project = await projectApi.create(draft);
      }
      upsertProject(project);
      designLifecycleRepository.setSelectedProjectId(project.PROJECT_ID);
      setWorkingSet((rows) => saveToProjectWorkingSet(rows, project, editor.mode));
      setSelectedProjectId(project.PROJECT_ID);
      setEditor({ mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: toProjectDraft(project), draft: toProjectDraft(project) });
      if (editor.mode !== 'EDIT') setSelectedProjectMemberId('');
      setWorkspaceMode('DETAIL');
      setMessage({ tone: 'success', text: `${project.PROJECT_NAME} 프로젝트를 저장했습니다.` });
    } catch (error) {
      // Somebody else changed or removed it: show the server's reason and read the list again.
      if (error instanceof ProjectApiError && (error.status === 409 || error.status === 404)) void refreshList();
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트를 저장하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const deleteProject = async () => {
    if (!activeProject) {
      setMessage({ tone: 'error', text: '삭제할 저장 프로젝트를 먼저 선택하세요.' });
      return;
    }
    if (busy || !window.confirm(`${activeProject.PROJECT_NAME} 프로젝트를 삭제하시겠습니까?`)) return;

    setBusy(true);
    try {
      const version = versionOf(activeProject.PROJECT_ID);
      if (version === undefined) throw new Error('최신 프로젝트 정보를 조회한 후 다시 삭제하세요.');
      await projectApi.remove(activeProject.PROJECT_ID, version);
      removeProjectFromCache(activeProject.PROJECT_ID);
      designLifecycleRepository.removeProjectMembersOf(activeProject.PROJECT_ID);
      const next = selectionAfterDelete(workingSet, activeProject.PROJECT_ID);
      const nextRows = workingSet.filter((project) => project.PROJECT_ID !== activeProject.PROJECT_ID);
      const nextProjectId = next.kind === 'EDIT' ? next.projectId : '';
      designLifecycleRepository.setSelectedProjectId(nextProjectId);
      setWorkingSet(nextRows);
      setSelectedProjectId(nextProjectId);
      setEditor(editorForSelection(next, nextRows));
      setSelectedProjectMemberId('');
      setWorkspaceMode('DETAIL');
      setMessage({ tone: 'success', text: `${activeProject.PROJECT_NAME} 프로젝트를 삭제했습니다.` });
    } catch (error) {
      if (error instanceof ProjectApiError && (error.status === 409 || error.status === 404)) void refreshList();
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트를 삭제하지 못했습니다.' });
    } finally {
      setBusy(false);
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
      minWidth: 100,
      flex: 2,
    },
    { key: 'customer', header: '고객명', render: (project) => project.CUSTOMER_NAME || '-', minWidth: 70, flex: 1.2 },
    { key: 'period', header: '기간', render: (project) => projectPeriod(project), width: 160, align: 'center' },
    { key: 'status', header: '상태', render: (project) => project.STATUS, width: 96, align: 'center' },
  ];
  const projectMembers = activeProject
    ? designLifecycleRepository.getData().projectMembers.filter((assignment) => assignment.PROJECT_ID === activeProject.PROJECT_ID)
    : [];
  const selectedProjectMember = projectMembers.find((item) => item.PROJECT_MEMBER_ID === selectedProjectMemberId);
  const projectMemberColumns: DataTableColumn<ProjectMember>[] = [
    { key: 'name', header: '이름', render: (assignment) => designLifecycleRepository.getData().members.find((member) => member.MEMBER_ID === assignment.MEMBER_ID)?.MEMBER_NAME ?? '-', minWidth: 120, flex: 1 },
    { key: 'participation', header: '참여구분', render: (assignment) => assignment.PARTICIPATION_TYPE_CD, width: 100 },
    { key: 'role', header: '역할', render: (assignment) => assignment.ROLE_CD, width: 80 },
    { key: 'grade', header: '등급', render: (assignment) => ({ BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '고급', EXPERT: '특급' })[assignment.GRADE_CD], width: 70 },
    { key: 'start', header: '투입 시작', render: (assignment) => assignment.START_DATE, width: 105 },
    { key: 'end', header: '투입 종료', render: (assignment) => assignment.END_DATE, width: 105 },
    { key: 'mm', header: '계획 MM', render: (assignment) => assignment.PLAN_MM, width: 76, align: 'right' },
    { key: 'status', header: '상태', render: (assignment) => assignment.STATUS_CD === 'ACTIVE' ? '참여' : '미참여', width: 76 },
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
  const projectHeaderActions = (
    <div className="standard-design-header-actions" aria-label="프로젝트 관리 기능">
      {projectStatus === 'ERROR' ? <ActionButton display="label" actionCode="SEARCH" label="다시 조회" onClick={() => void refreshList()} /> : null}
      <ActionButton display="label" actionCode="CREATE" label="신규" tone="primary" onClick={createProject} disabled={projectStatus === 'ERROR'} />
      {editor ? <>
        <ActionButton display="label" actionCode="CREATE" label="복사" onClick={copyProject} disabled={!activeProject} />
        <button type="submit" form="project-detail-form" disabled={busy} className="primary-button" data-action-code={editor.mode === 'EDIT' ? 'UPDATE' : 'CREATE'}>저장</button>
        <ActionButton display="label" actionCode="DELETE" label="삭제" tone="danger" onClick={() => void deleteProject()} disabled={!activeProject || busy} />
      </> : null}
    </div>
  );
  return <div className="page standard-design-page standard-design-lifecycle-page standard-design-project-page sd-project-mgmt-page">
    <PageHeader breadcrumbs={['Standard Design', '프로젝트 관리']} rightContent={projectHeaderActions} />
    <ProjectListDetailWorkspace
      initialListWidthPercent={40}
      mode={workspaceMode}
      onModeChange={setWorkspaceMode}
      list={<div className="project-list-detail-workspace__list-content" data-applied-search={getAppliedSearchDescription(appliedCondition)}>
        {projectSearchOpen ? (
          <div id="project-inline-search" className="project-inline-search" onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) {
              event.preventDefault();
              runSearch(searchCondition);
            }
          }}>
          <SearchPanel
            actionDisplay="label"
            rows={1}
            fields={projectSearchFields}
            value={searchCondition}
            initialValue={initialProjectSearchCondition}
            onValueChange={setSearchCondition}
            onSearch={runSearch}
            onReset={runSearch}
          />
          </div>
        ) : null}
        <div className="project-master-heading">
          <h2>프로젝트 목록 <span>({workingSet.length}건)</span></h2>
          <button type="button" className="secondary-button" aria-expanded={projectSearchOpen} aria-controls="project-inline-search" onClick={() => setProjectSearchOpen((open) => !open)}>검색</button>
        </div>
        <DataTable
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
        <form id="project-detail-form" className="standard-design-lifecycle-form standard-design-project-form" noValidate onSubmit={(event) => void saveProject(event)}>
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
          <RequiredFieldsNotice />
          <div className="standard-design-project-fields">
            <FormField label="프로젝트명" required labelPosition="LEFT"><input name="PROJECT_NAME" required value={editor.draft.PROJECT_NAME} onChange={(event) => updateDraft('PROJECT_NAME', event.target.value)} /></FormField>
            <FormField label="고객명" required labelPosition="LEFT"><input name="CUSTOMER_NAME" required value={editor.draft.CUSTOMER_NAME} onChange={(event) => updateDraft('CUSTOMER_NAME', event.target.value)} /></FormField>
            <FormField label="상태" labelPosition="LEFT"><select name="STATUS" value={editor.draft.STATUS} onChange={(event) => updateDraft('STATUS', event.target.value as DesignStatus)}>{STATUS.map((status) => <option key={status}>{status}</option>)}</select></FormField>
            <FormField label="시작일" required labelPosition="LEFT"><input name="START_DATE" type="date" required value={editor.draft.START_DATE} onChange={(event) => updateDraft('START_DATE', event.target.value)} /></FormField>
            <FormField label="종료일" required labelPosition="LEFT"><input name="END_DATE" type="date" required value={editor.draft.END_DATE} onChange={(event) => updateDraft('END_DATE', event.target.value)} /></FormField>
            <FormField label="설명" labelPosition="LEFT" className="standard-design-project-description"><textarea name="DESCRIPTION" rows={2} value={editor.draft.DESCRIPTION} onChange={(event) => updateDraft('DESCRIPTION', event.target.value)} /></FormField>
          </div>
        </form>
        {editor.mode === 'EDIT' && activeProject ? <section className="sd-project-member-section" aria-label="프로젝트 멤버 관리">
          <div className="sd-project-member-heading">
            <h2>프로젝트 멤버 <span>({projectMembers.length}명)</span></h2>
            <div>
              <button type="button" className="primary-button" onClick={() => { setEditingProjectMember(undefined); setMemberDialogOpen(true); }}>인원 추가</button>
              <button type="button" className="secondary-button" disabled={!selectedProjectMember} onClick={() => {
                setEditingProjectMember(selectedProjectMember);
                setMemberDialogOpen(true);
              }}>수정</button>
              <button type="button" className="danger-button" disabled={!selectedProjectMember} onClick={() => {
                if (selectedProjectMember && window.confirm('선택한 프로젝트 참여 정보를 삭제하시겠습니까?')) {
                  designLifecycleRepository.deleteItem('projectMembers', selectedProjectMember.PROJECT_MEMBER_ID);
                  setSelectedProjectMemberId('');
                }
              }}>삭제</button>
            </div>
          </div>
          <DataTable columns={projectMemberColumns} rows={projectMembers} getRowKey={(item) => item.PROJECT_MEMBER_ID}
            onRowClick={(item) => setSelectedProjectMemberId(item.PROJECT_MEMBER_ID)}
            getRowClassName={(item) => item.PROJECT_MEMBER_ID === selectedProjectMemberId ? 'selected-row' : ''}
            emptyMessage="등록된 프로젝트 멤버가 없습니다." />
        </section> : null}
        </>
      ) : <div className="sd-project-mgmt-empty"><strong>프로젝트를 선택하세요</strong><span>목록이 조회되면 프로젝트 상세가 표시됩니다.</span></div>}
    />
    <div className="sd-project-mgmt-message-area" aria-live="polite">
      {projectStatus === 'ERROR' ? <ProjectMessageBanner message={{ tone: 'error', text: `${projectError} 프로젝트는 서버에서만 조회합니다.` }} /> : null}
      {projectStatus === 'LOADING' || projectStatus === 'IDLE' ? <ProjectMessageBanner message={{ tone: 'info', text: '프로젝트 목록을 서버에서 조회하는 중입니다.' }} /> : null}
      {message ? <ProjectMessageBanner message={message} /> : null}
    </div>
    {memberDialogOpen && activeProject ? <ProjectMemberDialog project={activeProject}
      members={designLifecycleRepository.getData().members} assignments={projectMembers} editing={editingProjectMember}
      onClose={() => setMemberDialogOpen(false)} onSave={(member: DesignMember, assignment) => {
        designLifecycleRepository.saveMember(member);
        designLifecycleRepository.saveProjectMember(assignment);
        setSelectedProjectMemberId(assignment.PROJECT_MEMBER_ID);
        setMemberDialogOpen(false);
        setMessage({ tone: 'success', text: `${member.MEMBER_NAME} 프로젝트 참여정보를 저장했습니다.` });
      }} /> : null}
  </div>;
}

function LifecycleDetailPage({ view, supplement }: { view: LifecycleView; supplement?: ReactNode }) {
  const [, setRevision] = useState(0);
  const { projectId } = useProjectContext();
  const [selection, setSelection] = useState({ projectId: '', id: '' });
  const selectedId = selection.projectId === projectId ? selection.id : '';
  const setSelectedId = (id: string) => setSelection({ projectId, id });
  const [message, setMessage] = useState('목록에서 대상을 선택하거나 신규 등록을 시작하세요.');
  const data = designLifecycleRepository.getData();
  const rows = getRows(view, projectId);
  const selected = rows.find((item) => itemId(item) === selectedId);
  const refresh = () => setRevision((value) => value + 1);
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
    if (view === 'overview') return;
    const type = view === 'wbs' ? 'wbsItems' : view === 'requirements' ? 'requirements' : view === 'screens' ? 'screens' : 'tables';
    designLifecycleRepository.deleteItem(type, selectedId);
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
    <PageHeader breadcrumbs={['Standard Design', labels[view]]} rightContent={['wbs', 'requirements', 'screens', 'database'].includes(view) ? <div className="standard-design-header-actions"><ProjectContextSelector /><div className="standard-design-lifecycle-actions" aria-label={`${labels[view]} 기능`}><button type="button" className="secondary-button" data-action-code="SEARCH" onClick={() => { refresh(); setMessage('목록을 조회했습니다.'); }}>조회</button><button type="button" className="primary-button" data-action-code="CREATE" onClick={create}>등록</button><button type="submit" form="lifecycle-detail-form" className="primary-button" data-action-code="UPDATE">저장</button><button type="button" className="danger-button" data-action-code="DELETE" onClick={remove}>삭제</button></div></div> : null} />
    <MasterDetailMultiGrid
      master={<DataTable title={`${labels[view]} 목록 (${rows.length}건)`} columns={columns} rows={rows} getRowKey={itemId} onRowClick={(item) => { setSelectedId(itemId(item)); setMessage(`${itemName(item)} 상세 정보를 불러왔습니다.`); }} selectedRowKeys={selectedId ? new Set([selectedId]) : new Set()} onSelectedRowKeysChange={(keys) => setSelectedId([...keys][0] ?? '')} emptyMessage="현재 Project Context에 등록된 항목이 없습니다." />}
      detailTop={<form id="lifecycle-detail-form" key={selectedId || 'new'} className="standard-design-lifecycle-form" onSubmit={save}><h2>{selected ? '상세 수정' : '신규 등록'}</h2><RequiredFieldsNotice /><FormField label="명칭" required labelPosition="TOP"><input name="NAME" required defaultValue={selected ? itemName(selected) : ''} /></FormField>{view === 'overview' ? <FormField label="고객명" required labelPosition="TOP"><input name="CUSTOMER_NAME" required defaultValue={selected && 'CUSTOMER_NAME' in selected ? selected.CUSTOMER_NAME : ''} /></FormField> : null}{view === 'wbs' ? <><FormField label="상위 WBS" labelPosition="TOP"><select name="PARENT_WBS_ID" defaultValue={selected && 'PARENT_WBS_ID' in selected ? selected.PARENT_WBS_ID ?? '' : ''}><option value="">없음</option>{relatedWbs.filter((item) => item.WBS_ID !== selectedId).map((item) => <option key={item.WBS_ID} value={item.WBS_ID}>{item.WBS_NAME}</option>)}</select></FormField><FormField label="레벨" required labelPosition="TOP"><input name="WBS_LEVEL" type="number" min="1" required defaultValue={selected && 'WBS_LEVEL' in selected ? selected.WBS_LEVEL : 1} /></FormField></> : null}{view === 'screens' ? <FormField label="화면 유형" labelPosition="TOP"><select name="SCREEN_TYPE" defaultValue={selected && 'SCREEN_TYPE' in selected ? selected.SCREEN_TYPE : 'LIST'}><option>LIST</option><option>DETAIL</option><option>POPUP</option></select></FormField> : null}{view === 'database' ? <><FormField label="논리명" required labelPosition="TOP"><input name="LOGICAL_NAME" required defaultValue={selected && 'LOGICAL_NAME' in selected ? selected.LOGICAL_NAME : ''} /></FormField><FormField label="Schema Catalog 참조" labelPosition="TOP"><select name="CATALOG_TABLE_KEY" defaultValue={selected && 'CATALOG_TABLE_KEY' in selected ? selected.CATALOG_TABLE_KEY ?? '' : ''}><option value="">미지정</option>{schemaCatalogRepository.getTables().map((item) => <option key={item.tableKey} value={item.tableKey}>{item.logicalName} ({item.physicalName})</option>)}</select></FormField></> : null}{view === 'requirements' ? <><FormField label="연결 WBS ID" labelPosition="TOP"><input name="WBS_IDS" defaultValue={selected && 'WBS_IDS' in selected ? selected.WBS_IDS.join(', ') : ''} placeholder="WBS-001, WBS-002" /></FormField><FormField label="연결 화면 ID" labelPosition="TOP"><input name="SCREEN_IDS" defaultValue={selected && 'SCREEN_IDS' in selected ? selected.SCREEN_IDS.join(', ') : ''} placeholder="SCR-001" /></FormField><FormField label="연결 테이블 ID" labelPosition="TOP"><input name="TABLE_IDS" defaultValue={selected && 'TABLE_IDS' in selected ? selected.TABLE_IDS.join(', ') : ''} placeholder="TBL-001" /></FormField></> : null}<FormField label="설명" labelPosition="TOP"><textarea name="DESCRIPTION" rows={2} defaultValue={selected && 'DESCRIPTION' in selected ? selected.DESCRIPTION : ''} /></FormField><FormField label="상태" labelPosition="TOP"><select name="STATUS" defaultValue={selected?.STATUS ?? 'DRAFT'}>{STATUS.map((item) => <option key={item}>{item}</option>)}</select></FormField></form>}
      detailBottom={linkPanel}
      message={message}
    />
  </div>;
}

/** Starts the screen from the server list: it remounts once when the first read finishes, never on later refreshes. */
function ProjectManagement() {
  useProjectContext();
  return <ProjectManagementPage key={hasLoadedProjects() ? 'loaded' : 'loading'} />;
}

export default function DesignLifecyclePage({ view, supplement }: { view: LifecycleView; supplement?: ReactNode }) {
  return view === 'overview'
    ? <ProjectManagement />
    : <LifecycleDetailPage view={view} supplement={supplement} />;
}
