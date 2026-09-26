import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import PageHeader from '../../../../components/common/PageHeader';
import BaseKitMessage from '../../../../components/common/BaseKitMessage';
import { coreCodeApi } from '../../../../services/coreCodeApi';
import { metadataRepository } from '../../../../repositories/metadataRepository';
import ProjectListDetailWorkspace, { type ProjectWorkspaceMode } from '../components/ProjectListDetailWorkspace';
import ProjectContextSelector from '../components/ProjectContextSelector';
import RequirementAttachmentPanel from '../components/RequirementAttachmentPanel';
import { useProjectContext } from '../components/useProjectContext';
import { requirementApi, type Requirement, type RequirementInput } from '../../requirement/requirementApi';

const emptyDraft = (projectId: string): RequirementInput => ({ PROJECT_ID: projectId, REQUIREMENT_NAME: '', REQUIREMENT_TYPE_CODE: 'NEW', DESCRIPTION: '', PROCESS_DESCRIPTION: '', STATUS: 'DRAFT', MENU_KEYS: [] });
const legacyKey = 'basekit.standard-design.lifecycle.v1';
interface LegacyRequirement { REQUIREMENT_ID: string; PROJECT_ID: string; REQUIREMENT_NAME: string; DESCRIPTION: string; STATUS: string; WBS_IDS?: string[]; SCREEN_IDS?: string[]; TABLE_IDS?: string[] }
function legacyRequirements(): LegacyRequirement[] {
  try { return (JSON.parse(localStorage.getItem(legacyKey) ?? '{}') as { requirements?: LegacyRequirement[] }).requirements ?? []; } catch { return []; }
}
const menuOptions = metadataRepository.getMenus().filter((menu) => menu.menuType === 'SCREEN');
const columns: DataTableColumn<Requirement>[] = [
  { key: 'id', header: 'ID', render: (row) => row.REQUIREMENT_ID, width: 155 },
  { key: 'name', header: '요구사항명', render: (row) => row.REQUIREMENT_NAME, flex: 1 },
  { key: 'status', header: '상태', render: (row) => row.STATUS, width: 100 },
];

export default function RequirementIntakePage() {
  const { projectId } = useProjectContext();
  const [rows, setRows] = useState<Requirement[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<RequirementInput>(() => emptyDraft(projectId));
  const [baseline, setBaseline] = useState('');
  const [mode, setMode] = useState<ProjectWorkspaceMode>('DETAIL');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [types, setTypes] = useState<{ CODE: string; CODE_NAME: string }[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = rows.find((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID === selectedId);
  const dirty = baseline !== '' && JSON.stringify(draft) !== baseline;
  const pendingLegacy = useMemo(() => legacyRequirements().filter((row) => row.PROJECT_ID === projectId && !rows.some((item) => item.LEGACY_SOURCE_ID === row.REQUIREMENT_ID)), [projectId, rows]);
  const visibleRows = rows.filter((row) => row.PROJECT_ID === projectId && `${row.REQUIREMENT_ID} ${row.REQUIREMENT_NAME}`.toLowerCase().includes(appliedKeyword.toLowerCase()));
  const confirmDiscard = () => !dirty || window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리시겠습니까?');
  const reportAttachmentError = useCallback((text: string) => setMessage({ type: 'error', text }), []);
  const select = (row: Requirement) => {
    const value: RequirementInput = { PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: row.REQUIREMENT_TYPE_CODE, DESCRIPTION: row.DESCRIPTION, PROCESS_DESCRIPTION: row.PROCESS_DESCRIPTION, STATUS: row.STATUS, MENU_KEYS: row.MENU_KEYS };
    setSelectedId(row.REQUIREMENT_ID); setDraft(value); setBaseline(JSON.stringify(value));
  };
  const load = async (id = '') => {
    if (!projectId) { setRows([]); return; }
    const next = await requirementApi.list(projectId); setRows(next);
    if (id) { const item = next.find((row) => row.REQUIREMENT_ID === id); if (item) select(item); }
  };
  useEffect(() => {
    let current = true;
    if (!projectId) return () => { current = false; };
    requirementApi.list(projectId).then((items) => { if (current) { setRows(items); setSelectedId(''); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); } })
      .catch((error: Error) => { if (current) setMessage({ type: 'error', text: error.message }); });
    return () => { current = false; };
  }, [projectId]);
  useEffect(() => { coreCodeApi.findCodes('REQUIREMENT_TYPE_CODE').then(setTypes).catch(() => setMessage({ type: 'error', text: '요구 유형 공통코드를 조회하지 못했습니다.' })); }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const update = <K extends keyof RequirementInput>(key: K, value: RequirementInput[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : '작업을 완료하지 못했습니다.' }); } finally { setBusy(false); } };
  const resetDraft = () => { setSelectedId(''); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.PROJECT_ID !== projectId) { setMessage({ type: 'warn', text: '프로젝트 변경이 완료된 후 다시 저장하세요.' }); return; }
    if (!draft.REQUIREMENT_NAME.trim()) { setMessage({ type: 'warn', text: '요구사항명을 입력하세요.' }); return; }
    void run(async () => { const saved = selectedId ? await requirementApi.update(selectedId, draft) : await requirementApi.create(draft); await load(saved.REQUIREMENT_ID); setMessage({ type: 'success', text: '요구사항을 저장했습니다.' }); });
  };
  const migrate = () => void run(async () => {
    let count = 0;
    for (const row of pendingLegacy) {
      const saved = await requirementApi.create({ PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: 'NEW', DESCRIPTION: row.DESCRIPTION ?? '', PROCESS_DESCRIPTION: '', STATUS: row.STATUS, MENU_KEYS: [], LEGACY_SOURCE_ID: row.REQUIREMENT_ID, LEGACY_WBS_IDS: JSON.stringify(row.WBS_IDS ?? []), LEGACY_SCREEN_IDS: JSON.stringify(row.SCREEN_IDS ?? []), LEGACY_TABLE_IDS: JSON.stringify(row.TABLE_IDS ?? []) });
      if (saved.LEGACY_SOURCE_ID !== row.REQUIREMENT_ID) throw new Error(`${row.REQUIREMENT_ID} 이관 확인에 실패했습니다.`); count += 1;
    }
    await load(); setMessage({ type: 'success', text: `${count}건 이관을 확인했습니다. 기존 브라우저 데이터는 보존됩니다.` });
  });
  return <div className="page standard-design-page standard-design-project-page sd-requirement-page">
    <PageHeader breadcrumbs={['Standard Design', '요구사항 관리']} rightContent={<div className="standard-design-header-actions"><ProjectContextSelector onSelected={() => confirmDiscard()} /><div className="standard-design-lifecycle-actions" aria-label="요구사항 기능">
      <button type="button" className="secondary-button" data-action-code="SEARCH" disabled={busy || !projectId} onClick={() => void run(async () => { await load(); setMessage({ type: 'info', text: '요구사항을 조회했습니다.' }); })}>조회</button>
      <button type="button" className="primary-button" data-action-code="CREATE" disabled={busy || !projectId} onClick={() => { if (confirmDiscard()) resetDraft(); }}>등록</button>
      <button type="submit" form="requirement-detail-form" className="primary-button" data-action-code="UPDATE" disabled={busy || !projectId}>저장</button>
      <button type="button" className="danger-button" data-action-code="DELETE" disabled={busy || !selectedId} onClick={() => { if (selectedId && window.confirm('선택한 요구사항과 첨부파일을 삭제하시겠습니까?')) void run(async () => { await requirementApi.delete(selectedId); resetDraft(); await load(); setMessage({ type: 'success', text: '요구사항을 삭제했습니다.' }); }); }}>삭제</button>
    </div></div>} />
    {!projectId ? <p className="sd-project-empty-help">프로젝트 Context를 선택하세요.</p> : <>
      {pendingLegacy.length > 0 ? <div className="sd-requirement-migration"><span>이 브라우저에 서버로 이관하지 않은 요구사항 {pendingLegacy.length}건이 있습니다.</span><button type="button" className="secondary-button" disabled={busy} onClick={migrate}>기존 데이터 이관</button></div> : null}
      <ProjectListDetailWorkspace subject="요구사항" mode={mode} onModeChange={setMode}
        list={<div className="project-list-detail-workspace__list-content"><div className="sd-requirement-search"><input aria-label="요구사항 검색" placeholder="ID/요구사항명" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setAppliedKeyword(keyword); }} /><button type="button" className="secondary-button" onClick={() => setAppliedKeyword(keyword)}>검색</button></div><DataTable title={`요구사항 목록 (${visibleRows.length}건)`} columns={columns} rows={visibleRows} getRowKey={(row) => row.REQUIREMENT_ID} onRowClick={(row) => { if (confirmDiscard()) select(row); }} getRowClassName={(row) => row.REQUIREMENT_ID === selectedId ? 'selected-row' : ''} emptyMessage="조회된 요구사항이 없습니다." /></div>}
        detail={<div className="sd-requirement-detail"><form id="requirement-detail-form" className="standard-design-lifecycle-form standard-design-project-form" onSubmit={save}><div className="standard-design-project-detail-heading"><h2>{selectedId ? '요구사항 상세' : '신규 요구사항'}</h2><dl className="standard-design-project-id"><div><dt>ID</dt><dd>{selectedId || '신규 저장 시 생성'}</dd></div></dl></div><div className="standard-design-project-fields">
          <label><span>요구사항명</span><input required maxLength={200} value={draft.REQUIREMENT_NAME} onChange={(e) => update('REQUIREMENT_NAME', e.target.value)} /></label>
          <label><span>요구 유형</span><select value={draft.REQUIREMENT_TYPE_CODE} onChange={(e) => update('REQUIREMENT_TYPE_CODE', e.target.value)}>{types.map((code) => <option key={code.CODE} value={code.CODE}>{code.CODE_NAME}</option>)}</select></label>
          <label><span>상태</span><select value={draft.STATUS} onChange={(e) => update('STATUS', e.target.value)}>{['DRAFT','IN_PROGRESS','REVIEW','APPROVED'].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="sd-requirement-menu"><span>관련 메뉴</span><select multiple size={5} value={draft.MENU_KEYS} onChange={(e) => update('MENU_KEYS', Array.from(e.target.selectedOptions, (option) => option.value))}>{menuOptions.map((menu) => <option key={menu.menuKey} value={menu.menuKey}>{menu.menuName} ({menu.menuKey})</option>)}</select></label>
          <label className="standard-design-project-description"><span>요구사항 설명</span><textarea rows={4} value={draft.DESCRIPTION} onChange={(e) => update('DESCRIPTION', e.target.value)} /></label>
          <label className="standard-design-project-description"><span>프로세스 설명</span><textarea rows={4} value={draft.PROCESS_DESCRIPTION} onChange={(e) => update('PROCESS_DESCRIPTION', e.target.value)} /></label>
        </div></form><RequirementAttachmentPanel requirementId={selectedId} attachments={selected?.ATTACHMENTS ?? []} onUploaded={(file) => { void load(selectedId); setMessage({ type: 'success', text: `${file.ORIGINAL_FILE_NAME}을(를) 업로드했습니다.` }); }} onDeleted={() => { void load(selectedId); setMessage({ type: 'success', text: '첨부파일을 삭제했습니다.' }); }} onError={reportAttachmentError} /><section className="sd-requirement-ai-slot"><h2>AI 요구사항 분석</h2><p>향후 분석 결과를 이 영역에서 검토합니다.</p></section></div>}
      />
    </>}
    {message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}
  </div>;
}
