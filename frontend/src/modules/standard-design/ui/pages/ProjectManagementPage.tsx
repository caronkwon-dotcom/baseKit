import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ActionButton, BaseKitMessage, MasterDetailMultiGrid, PageHeader, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../../../../components/common';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import type { DesignMember, DesignProject, DesignStatus, ProjectMember } from '../../design-lifecycle/designLifecycle.types';
import { ProjectApiError, projectApi } from '../../projects/projectApi';
import { initialSelection, selectionAfterDelete, areaMessage, type ProjectSelection } from '../../projects/projectManagement';
import { getProjectError, getProjectStatus, getProjects, loadProjects, removeProjectFromCache, upsertProject } from '../../projects/projectStore';
import {
  toProjectDraft, createEmptyProjectDraft, searchProjectSnapshot, saveToProjectWorkingSet, isProjectDraftDirty, getEditorProject,
  type ProjectSearchCondition, type ProjectEditor, type ProjectDraft, type ProjectMessageTone,
} from '../components/projectReference';
import ProjectMemberDialog from '../components/ProjectMemberDialog';
import { validateProjectDates } from '../components/projectContext';
import { useProjectContext } from '../components/useProjectContext';

const PROGRAM_KEY = 'SD_PROJECT_MGMT';
const STATUS: DesignStatus[] = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'];
const GRADE = { BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '고급', EXPERT: '특급' } as const;

interface ProjectMessage { tone: ProjectMessageTone; text: string }

const initialSearchCondition: ProjectSearchCondition = { PROJECT_NAME: '', CUSTOMER_NAME: '', STATUS: '' };
const searchFields: SearchFieldConfig<ProjectSearchCondition>[] = [
  { key: 'PROJECT_NAME', label: '프로젝트명', placeholder: '프로젝트명' },
  { key: 'CUSTOMER_NAME', label: '고객명', placeholder: '고객명' },
  { key: 'STATUS', label: '상태', controlType: 'select', options: [{ value: '', label: '전체' }, ...STATUS.map(status => ({ value: status, label: status }))] },
];

const editorFor = (project: DesignProject): ProjectEditor => {
  const draft = toProjectDraft(project);
  return { mode: 'EDIT', sourceProjectId: project.PROJECT_ID, initialDraft: draft, draft };
};
const newEditor = (): ProjectEditor => { const draft = createEmptyProjectDraft(); return { mode: 'NEW', initialDraft: draft, draft }; };
const editorForSelection = (selection: ProjectSelection, rows: DesignProject[]): ProjectEditor | null => {
  if (selection.kind === 'NEW') return newEditor();
  if (selection.kind !== 'EDIT') return null;
  const project = rows.find(item => item.PROJECT_ID === selection.projectId);
  return project ? editorFor(project) : null;
};

/** Project management: list on the left, basic information and members on the right. Opens straight into this view. */
export default function ProjectManagementPage() {
  const { status: projectStatus } = useProjectContext();
  const [first] = useState(() => {
    const rows = getProjects();
    const selection = initialSelection(getProjectStatus(), rows, designLifecycleRepository.getSelectedProjectId());
    return { rows, selection, editor: editorForSelection(selection, rows) };
  });
  const [workingSet, setWorkingSet] = useState(first.rows);
  const [busy, setBusy] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(first.selection.kind === 'EDIT' ? first.selection.projectId : '');
  const [searchCondition, setSearchCondition] = useState<ProjectSearchCondition>(initialSearchCondition);
  const [appliedCondition, setAppliedCondition] = useState<ProjectSearchCondition>(initialSearchCondition);
  const [editor, setEditor] = useState<ProjectEditor | null>(first.editor);
  const [message, setMessage] = useState<ProjectMessage | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingProjectMember, setEditingProjectMember] = useState<ProjectMember | undefined>();
  const [selectedProjectMemberId, setSelectedProjectMemberId] = useState('');
  const activeProject = getEditorProject(editor);
  const hasUnsavedChanges = isProjectDraftDirty(editor);
  const versionOf = (projectId: string) => getProjects().find(project => project.PROJECT_ID === projectId)?.VERSION;

  // The project context follows the screen's selection (the first row becomes the context when none was chosen).
  useEffect(() => {
    if (first.selection.kind === 'EDIT' && designLifecycleRepository.getSelectedProjectId() !== first.selection.projectId) designLifecycleRepository.setSelectedProjectId(first.selection.projectId);
  }, [first.selection]);

  /** Reads the server list again and re-applies the executed search; saves keep the working set. */
  const refreshList = async () => {
    await loadProjects();
    setWorkingSet(searchProjectSnapshot(getProjects(), appliedCondition).rows);
  };

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [hasUnsavedChanges]);

  const confirmDiscardChanges = () => !hasUnsavedChanges || window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 계속하시겠습니까?');

  // The shared grid reports one click as both a row click and a cell click: act on it once, or the discard confirmation would appear twice.
  const lastOpen = useRef({ id: '', at: 0 });
  const openProjectDetail = (project: DesignProject) => {
    const now = Date.now();
    if (lastOpen.current.id === project.PROJECT_ID && now - lastOpen.current.at < 600) return false;
    lastOpen.current = { id: project.PROJECT_ID, at: now };
    if (editor?.mode === 'EDIT' && editor.sourceProjectId === project.PROJECT_ID) { setSelectedProjectId(project.PROJECT_ID); return true; }
    if (!confirmDiscardChanges()) return false;
    setSelectedProjectId(project.PROJECT_ID);
    designLifecycleRepository.setSelectedProjectId(project.PROJECT_ID);
    setEditor(editorFor(project));
    setSelectedProjectMemberId('');
    setMessage(null);
    return true;
  };

  const createProject = () => {
    if (!confirmDiscardChanges()) return;
    setSelectedProjectId('');
    setEditor(newEditor());
    setSelectedProjectMemberId('');
    setMessage(null);
  };

  const copyProject = () => {
    if (!activeProject || !confirmDiscardChanges()) return;
    const draft = toProjectDraft(activeProject);
    setEditor({ mode: 'COPY', initialDraft: draft, draft });
    setSelectedProjectMemberId('');
    setMessage(null);
  };

  const updateDraft = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setEditor(currentEditor => currentEditor ? { ...currentEditor, draft: { ...currentEditor.draft, [key]: value } } : currentEditor);
  };

  const runSearch = (condition: ProjectSearchCondition) => {
    try {
      const result = searchProjectSnapshot(getProjects(), condition);
      setWorkingSet(result.rows);
      setAppliedCondition(result.condition);
      setMessage(result.rows.length === 0 ? { tone: 'warning', text: '조회 조건에 맞는 프로젝트가 없습니다. 조건을 조정한 후 다시 조회하세요.' } : null);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트 목록을 조회하지 못했습니다.' });
    }
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    const draft = { ...editor.draft, PROJECT_NAME: editor.draft.PROJECT_NAME.trim(), CUSTOMER_NAME: editor.draft.CUSTOMER_NAME.trim(), DESCRIPTION: editor.draft.DESCRIPTION.trim() };
    if (!draft.PROJECT_NAME || !draft.CUSTOMER_NAME) { setMessage({ tone: 'error', text: '프로젝트명과 고객명은 필수입니다.' }); return; }
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
      setWorkingSet(rows => saveToProjectWorkingSet(rows, project, editor.mode));
      setSelectedProjectId(project.PROJECT_ID);
      setEditor(editorFor(project));
      if (editor.mode !== 'EDIT') setSelectedProjectMemberId('');
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
    if (!activeProject) { setMessage({ tone: 'error', text: '삭제할 저장 프로젝트를 먼저 선택하세요.' }); return; }
    if (busy || !window.confirm(`${activeProject.PROJECT_NAME} 프로젝트를 삭제하시겠습니까?`)) return;

    setBusy(true);
    try {
      const version = versionOf(activeProject.PROJECT_ID);
      if (version === undefined) throw new Error('최신 프로젝트 정보를 조회한 후 다시 삭제하세요.');
      await projectApi.remove(activeProject.PROJECT_ID, version);
      removeProjectFromCache(activeProject.PROJECT_ID);
      designLifecycleRepository.removeProjectMembersOf(activeProject.PROJECT_ID);
      const next = selectionAfterDelete(workingSet, activeProject.PROJECT_ID);
      const nextRows = workingSet.filter(project => project.PROJECT_ID !== activeProject.PROJECT_ID);
      const nextId = next.kind === 'EDIT' ? next.projectId : '';
      designLifecycleRepository.setSelectedProjectId(nextId);
      setWorkingSet(nextRows);
      setSelectedProjectId(nextId);
      setEditor(editorForSelection(next, nextRows));
      setSelectedProjectMemberId('');
      setMessage({ tone: 'success', text: `${activeProject.PROJECT_NAME} 프로젝트를 삭제했습니다.` });
    } catch (error) {
      if (error instanceof ProjectApiError && (error.status === 409 || error.status === 404)) void refreshList();
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '프로젝트를 삭제하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const projectColumns: DataTableColumn<DesignProject>[] = [
    { key: 'id', header: 'ID', render: project => project.PROJECT_ID, width: 84 },
    { key: 'name', header: '프로젝트명', render: project => project.PROJECT_NAME, minWidth: 110, flex: 2.2 },
    { key: 'customer', header: '고객명', render: project => project.CUSTOMER_NAME, minWidth: 76, flex: 1.4 },
    { key: 'status', header: '상태', render: project => project.STATUS, width: 100, align: 'center' },
  ];
  const projectMembers = activeProject ? designLifecycleRepository.getData().projectMembers.filter(assignment => assignment.PROJECT_ID === activeProject.PROJECT_ID) : [];
  const selectedProjectMember = projectMembers.find(item => item.PROJECT_MEMBER_ID === selectedProjectMemberId);
  const memberColumns: DataTableColumn<ProjectMember>[] = [
    { key: 'name', header: '이름', render: assignment => designLifecycleRepository.getData().members.find(member => member.MEMBER_ID === assignment.MEMBER_ID)?.MEMBER_NAME ?? '-', minWidth: 110, flex: 1 },
    { key: 'participation', header: '참여구분', render: assignment => assignment.PARTICIPATION_TYPE_CD, width: 96 },
    { key: 'role', header: '역할', render: assignment => assignment.ROLE_CD, width: 80 },
    { key: 'grade', header: '등급', render: assignment => GRADE[assignment.GRADE_CD], width: 70 },
    { key: 'start', header: '투입 시작', render: assignment => assignment.START_DATE, width: 105 },
    { key: 'end', header: '투입 종료', render: assignment => assignment.END_DATE, width: 105 },
    { key: 'mm', header: '계획 MM', render: assignment => assignment.PLAN_MM, width: 76, align: 'right' },
    { key: 'status', header: '상태', render: assignment => assignment.STATUS_CD === 'ACTIVE' ? '참여' : '미참여', width: 76 },
  ];
  const deleteMember = () => {
    if (selectedProjectMember && window.confirm('선택한 프로젝트 참여 정보를 삭제하시겠습니까?')) {
      designLifecycleRepository.deleteItem('projectMembers', selectedProjectMember.PROJECT_MEMBER_ID);
      setSelectedProjectMemberId('');
    }
  };

  const editorTitle = editor?.mode === 'EDIT' ? '프로젝트 상세' : editor?.mode === 'COPY' ? '신규 등록 (복사)' : '신규 등록';
  const editorDescription = editor?.mode === 'EDIT' ? '' : editor?.mode === 'COPY' ? '프로젝트명, 고객명, 설명, 상태만 복사했습니다. 저장 시 새 프로젝트가 생성됩니다.' : '저장 시 새 프로젝트 ID가 생성됩니다.';
  const headerActions = <div className="standard-design-header-actions" aria-label="프로젝트 관리 기능">
    {projectStatus === 'ERROR' ? <ActionButton display="label" actionCode="SEARCH" label="다시 조회" onClick={() => void refreshList()} /> : null}
    <ActionButton display="label" actionCode="CREATE" label="신규" tone="primary" onClick={createProject} disabled={projectStatus === 'ERROR'} />
    {editor ? <>
      <ActionButton display="label" actionCode="CREATE" label="복사" onClick={copyProject} disabled={!activeProject} />
      <ActionButton display="label" actionCode={editor.mode === 'EDIT' ? 'UPDATE' : 'CREATE'} label="저장" tone="primary" htmlType="submit" form="project-detail-form" disabled={busy} onClick={() => undefined} />
      <ActionButton display="label" actionCode="DELETE" label="삭제" tone="danger" onClick={() => void deleteProject()} disabled={!activeProject || busy} />
    </> : null}
  </div>;
  const notice = areaMessage(message, projectStatus, getProjectError());

  return <section className="page standard-design-page multi-grid-page sd-project-mgmt-page">
    <PageHeader breadcrumbs={['Standard Design', '프로젝트 관리']} rightContent={headerActions} />
    <div onKeyDown={event => {
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) { event.preventDefault(); runSearch(searchCondition); }
    }}>
      <SearchPanel actionDisplay="label" rows={1} fields={searchFields} value={searchCondition} initialValue={initialSearchCondition} onValueChange={setSearchCondition} onSearch={runSearch} onReset={runSearch} />
    </div>
    <MasterDetailMultiGrid
      master={<BaseKitDataGrid programKey={PROGRAM_KEY} roleCode="ADMIN" title="프로젝트 목록" selectable={false} toolbarActions={[]} columns={projectColumns} rows={workingSet}
        getRowKey={project => project.PROJECT_ID} currentRowKey={selectedProjectId} loading={projectStatus === 'LOADING'} onRowClick={project => { openProjectDetail(project); }} emptyMessage="조회 조건에 맞는 프로젝트가 없습니다." />}
      detailEmpty={editor ? undefined : <div className="sd-project-mgmt-empty"><strong>프로젝트를 선택하세요</strong><span>목록이 조회되면 프로젝트 상세가 표시됩니다.</span></div>}
      detailTop={editor ? <form id="project-detail-form" className="standard-design-lifecycle-form standard-design-project-form sd-project-mgmt-form" noValidate onSubmit={event => void saveProject(event)}>
        <div className="standard-design-project-detail-heading">
          <div>
            <div className="standard-design-project-title-row">
              <h2>{editorTitle}</h2>
              {editor.mode !== 'EDIT' ? <span className="standard-design-project-editor-state">{editor.mode === 'COPY' ? 'COPY' : 'NEW'}</span> : null}
            </div>
            {editorDescription ? <p>{editorDescription}</p> : null}
          </div>
          <dl className="standard-design-project-id"><div><dt>ID</dt><dd>{editor.mode === 'EDIT' ? editor.sourceProjectId : '신규 저장 시 생성'}</dd></div></dl>
        </div>
        <div className="standard-design-project-fields">
          <label><span>프로젝트명</span><input name="PROJECT_NAME" required value={editor.draft.PROJECT_NAME} onChange={event => updateDraft('PROJECT_NAME', event.target.value)} /></label>
          <label><span>고객명</span><input name="CUSTOMER_NAME" required value={editor.draft.CUSTOMER_NAME} onChange={event => updateDraft('CUSTOMER_NAME', event.target.value)} /></label>
          <label><span>상태</span><select name="STATUS" value={editor.draft.STATUS} onChange={event => updateDraft('STATUS', event.target.value as DesignStatus)}>{STATUS.map(status => <option key={status}>{status}</option>)}</select></label>
          <label><span>시작일</span><input name="START_DATE" type="date" required value={editor.draft.START_DATE} onChange={event => updateDraft('START_DATE', event.target.value)} /></label>
          <label><span>종료일</span><input name="END_DATE" type="date" required value={editor.draft.END_DATE} onChange={event => updateDraft('END_DATE', event.target.value)} /></label>
          <label className="standard-design-project-description"><span>설명</span><textarea name="DESCRIPTION" rows={2} value={editor.draft.DESCRIPTION} onChange={event => updateDraft('DESCRIPTION', event.target.value)} /></label>
        </div>
      </form> : null}
      detailBottom={editor?.mode === 'EDIT' && activeProject
        ? <BaseKitDataGrid programKey={PROGRAM_KEY} roleCode="ADMIN" title={`프로젝트 멤버 (${projectMembers.length}명)`} selectable={false} columns={memberColumns} rows={projectMembers}
          getRowKey={item => item.PROJECT_MEMBER_ID} currentRowKey={selectedProjectMemberId} onRowClick={item => setSelectedProjectMemberId(item.PROJECT_MEMBER_ID)} emptyMessage="등록된 프로젝트 멤버가 없습니다."
          toolbarActions={[
            { actionCode: 'CREATE', label: '인원 추가', tone: 'primary', onClick: () => { setEditingProjectMember(undefined); setMemberDialogOpen(true); } },
            { actionCode: 'UPDATE', label: '수정', disabled: !selectedProjectMember, onClick: () => { setEditingProjectMember(selectedProjectMember); setMemberDialogOpen(true); } },
            { actionCode: 'DELETE', label: '삭제', tone: 'danger', disabled: !selectedProjectMember, onClick: deleteMember },
          ]} />
        : <div className="sd-project-mgmt-empty"><strong>프로젝트 멤버</strong><span>{editor ? '프로젝트를 저장한 후 멤버를 등록할 수 있습니다.' : '프로젝트를 선택하면 멤버가 표시됩니다.'}</span></div>}
      message={notice ? <BaseKitMessage type={notice.type} message={notice.text} /> : null}
    />
    {memberDialogOpen && activeProject ? <ProjectMemberDialog project={activeProject}
      members={designLifecycleRepository.getData().members} assignments={projectMembers} editing={editingProjectMember}
      onClose={() => setMemberDialogOpen(false)} onSave={(member: DesignMember, assignment) => {
        designLifecycleRepository.saveMember(member);
        designLifecycleRepository.saveProjectMember(assignment);
        setSelectedProjectMemberId(assignment.PROJECT_MEMBER_ID);
        setMemberDialogOpen(false);
        setMessage({ tone: 'success', text: `${member.MEMBER_NAME} 프로젝트 참여정보를 저장했습니다.` });
      }} /> : null}
  </section>;
}

