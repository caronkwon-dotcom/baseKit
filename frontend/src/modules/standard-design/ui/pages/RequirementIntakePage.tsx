import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import PageHeader from '../../../../components/common/PageHeader';
import BaseKitMessage from '../../../../components/common/BaseKitMessage';
import { BaseTabs, type BaseTabDefinition } from '../../../../components/common';
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
const columns: DataTableColumn<Requirement>[] = [
  { key: 'id', header: 'ID', render: (row) => row.REQUIREMENT_ID, width: 155 },
  { key: 'name', header: '요구사항명', render: (row) => row.REQUIREMENT_NAME, flex: 1 },
  { key: 'status', header: '상태', render: (row) => row.STATUS, width: 100 },
];
const relationshipTypes = ['참조', '선행', '후행', '중복'];

export default function RequirementIntakePage() {
  const { projectId } = useProjectContext();
  const menuOptions = useMemo(() => metadataRepository.getMenus().filter((menu) => menu.menuType === 'SCREEN'), []);
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
  const [activeTab, setActiveTab] = useState('basic');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [relationshipType, setRelationshipType] = useState(relationshipTypes[0]);
  const [analysisRequirementIds, setAnalysisRequirementIds] = useState<string[]>([]);
  const selected = rows.find((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID === selectedId);
  const connectedRequirements = rows.filter((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID !== selectedId);
  const dirty = baseline !== '' && JSON.stringify(draft) !== baseline;
  const pendingLegacy = useMemo(() => legacyRequirements().filter((row) => row.PROJECT_ID === projectId && !rows.some((item) => item.LEGACY_SOURCE_ID === row.REQUIREMENT_ID)), [projectId, rows]);
  const visibleRows = rows.filter((row) => row.PROJECT_ID === projectId && `${row.REQUIREMENT_ID} ${row.REQUIREMENT_NAME}`.toLowerCase().includes(appliedKeyword.toLowerCase()));
  const confirmDiscard = () => !dirty || window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리시겠습니까?');
  const reportAttachmentError = useCallback((text: string) => setMessage({ type: 'error', text }), []);
  const select = (row: Requirement) => {
    const value: RequirementInput = { PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: row.REQUIREMENT_TYPE_CODE, DESCRIPTION: row.DESCRIPTION, PROCESS_DESCRIPTION: row.PROCESS_DESCRIPTION, STATUS: row.STATUS, MENU_KEYS: row.MENU_KEYS };
    setSelectedId(row.REQUIREMENT_ID); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); setAnalysisRequirementIds([]);
  };
  const load = async (id = '') => {
    if (!projectId) { setRows([]); return; }
    const next = await requirementApi.list(projectId); setRows(next);
    if (id) { const item = next.find((row) => row.REQUIREMENT_ID === id); if (item) select(item); }
  };
  useEffect(() => {
    let current = true;
    if (!projectId) return () => { current = false; };
    requirementApi.list(projectId).then((items) => { if (current) { setRows(items); setSelectedId(''); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); } })
      .catch((error: Error) => { if (current) setMessage({ type: 'error', text: error.message }); });
    return () => { current = false; };
  }, [projectId]);
  useEffect(() => { coreCodeApi.findCodes('REQUIREMENT_TYPE_CODE').then(setTypes).catch(() => setMessage({ type: 'error', text: '요구 유형 공통코드를 조회하지 못했습니다.' })); }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const update = <K extends keyof RequirementInput>(key: K, value: RequirementInput[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : '작업을 완료하지 못했습니다.' }); } finally { setBusy(false); } };
  const resetDraft = () => { setSelectedId(''); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); setAnalysisRequirementIds([]); };
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
  const basicInfo: ReactNode = <div className="standard-design-project-fields">
    <label><span>요구사항명</span><input required maxLength={200} value={draft.REQUIREMENT_NAME} onChange={(e) => update('REQUIREMENT_NAME', e.target.value)} /></label>
    <label><span>요구 유형</span><select value={draft.REQUIREMENT_TYPE_CODE} onChange={(e) => update('REQUIREMENT_TYPE_CODE', e.target.value)}>{types.map((code) => <option key={code.CODE} value={code.CODE}>{code.CODE_NAME}</option>)}</select></label>
    <label><span>상태</span><select value={draft.STATUS} onChange={(e) => update('STATUS', e.target.value)}>{['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'].map((status) => <option key={status}>{status}</option>)}</select></label>
    <label className="sd-requirement-menu"><span>관련 메뉴</span><select multiple size={5} value={draft.MENU_KEYS} onChange={(e) => update('MENU_KEYS', Array.from(e.target.selectedOptions, (option) => option.value))}>{menuOptions.map((menu) => <option key={menu.menuKey} value={menu.menuKey}>{menu.menuName} ({menu.menuKey})</option>)}</select></label>
    <label className="standard-design-project-description"><span>요구사항 설명</span><textarea rows={4} value={draft.DESCRIPTION} onChange={(e) => update('DESCRIPTION', e.target.value)} /></label>
    <label className="standard-design-project-description"><span>프로세스 설명</span><textarea rows={4} value={draft.PROCESS_DESCRIPTION} onChange={(e) => update('PROCESS_DESCRIPTION', e.target.value)} /></label>
  </div>;
  const attachmentTab: ReactNode = <RequirementAttachmentPanel requirementId={selectedId} attachments={selected?.ATTACHMENTS ?? []} onUploaded={(file) => { void load(selectedId); setMessage({ type: 'success', text: `${file.ORIGINAL_FILE_NAME}을(를) 업로드했습니다.` }); }} onDeleted={() => { void load(selectedId); setMessage({ type: 'success', text: '첨부파일을 삭제했습니다.' }); }} onError={reportAttachmentError} />;
  const aiTab: ReactNode = <section className="base-tab-placeholder" aria-label="AI 분석 준비 영역">
    <h3>AI 요구사항 분석</h3>
    <p>분석 실행과 결과 저장은 후속 AI 연계 범위입니다. 현재는 분석 대상과 프롬프트를 준비하는 화면 골격만 제공합니다.</p>
    <div className="base-tab-placeholder__grid">
      <label className="base-tab-placeholder__field"><span>현재 요구사항</span><input value={selected ? `${selected.REQUIREMENT_ID} · ${selected.REQUIREMENT_NAME}` : '신규 요구사항은 저장 후 분석할 수 있습니다.'} readOnly /></label>
      <label className="base-tab-placeholder__field"><span>관계 유형</span><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}>{relationshipTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="base-tab-placeholder__field base-tab-placeholder__field--wide"><span>연결할 요구사항</span><select multiple size={4} value={analysisRequirementIds} onChange={(event) => setAnalysisRequirementIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{connectedRequirements.map((row) => <option key={row.REQUIREMENT_ID} value={row.REQUIREMENT_ID}>{row.REQUIREMENT_ID} · {row.REQUIREMENT_NAME}</option>)}</select></label>
      <label className="base-tab-placeholder__field base-tab-placeholder__field--wide"><span>분석 입력</span><textarea rows={4} value={analysisPrompt} onChange={(event) => setAnalysisPrompt(event.target.value)} placeholder="분석 관점이나 확인할 질문을 입력하세요." /></label>
    </div>
    <div className="base-tab-placeholder__actions"><button type="button" className="primary-button" disabled={!selectedId || busy}>분석 실행 준비 중</button></div>
    <div className="base-tab-placeholder__grid"><div className="base-tab-placeholder"><h3>분석 결과</h3><p>Extracted Text, OCR, LLM 요약·구조화 결과가 연결될 자리입니다.</p></div><div className="base-tab-placeholder"><h3>설계 후보</h3><p>프로세스 정의와 화면·테이블 설계 후보 템플릿이 표시될 자리입니다.</p></div></div>
  </section>;
  const relatedTab: ReactNode = <section className="base-tab-placeholder" aria-label="연관정보 준비 영역">
    <h3>연관정보</h3>
    <p>요구사항 관계와 설계 Traceability를 표시할 준비 영역입니다. 현재는 별도 관계 데이터를 저장하지 않습니다.</p>
    <div className="base-tab-placeholder__grid"><div className="base-tab-placeholder"><h3>Requirement 관계</h3><p>{selectedId ? '저장된 관계 데이터가 없습니다.' : '요구사항을 저장하면 관계를 확인할 수 있습니다.'}</p></div><div className="base-tab-placeholder"><h3>설계 Traceability</h3><p>Requirement → WBS → Screen → Table 연결은 후속 설계 단계에서 관리됩니다.</p></div></div>
  </section>;
  const tabs: BaseTabDefinition[] = [
    { id: 'basic', label: '기본정보', content: basicInfo },
    { id: 'attachments', label: '첨부/미리보기', content: attachmentTab },
    { id: 'analysis', label: 'AI 분석', content: aiTab },
    { id: 'related', label: '연관정보', content: relatedTab },
  ];
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
        detail={<div className="sd-requirement-detail"><form id="requirement-detail-form" className="standard-design-lifecycle-form standard-design-project-form" onSubmit={save}><div className="standard-design-project-detail-heading"><h2>{selectedId ? '요구사항 상세' : '신규 요구사항'}</h2><dl className="standard-design-project-id"><div><dt>ID</dt><dd>{selectedId || '신규 저장 시 생성'}</dd></div></dl></div><BaseTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} ariaLabel="요구사항 상세" /></form></div>}
      />
    </>}
    {message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}
  </div>;
}
