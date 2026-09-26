import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ActionButton, BaseKitMessage, BaseTabs, PageHeader, SearchPanel, type BaseTabDefinition, type DataTableColumn, type SearchFieldConfig } from '../../../../components/common';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import { StatusColorIndicator } from '../../../../components/grid/gridCellComponents';
import { useGridRowState, type TrackedGridRow } from '../../../../components/grid/gridRowState';
import { coreCodeApi } from '../../../../services/coreCodeApi';
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
interface RequirementSearchCondition { keyword: string; menuKeyword: string; requirementType: string; status: string }
interface MenuRelationRow { MENU_KEY: string; MENU_NAME: string }
const initialSearchCondition: RequirementSearchCondition = { keyword: '', menuKeyword: '', requirementType: '', status: '' };
const relationshipTypes = ['참조', '선행', '후행', '중복'];
const menuRelationKey = (row: MenuRelationRow) => row.MENU_KEY;
const defaultRequirementStatuses = [
  { CODE: 'DRAFT', CODE_NAME: '초안', CODE_ID: 'REQUIREMENT_STATUS_DRAFT' },
  { CODE: 'IN_PROGRESS', CODE_NAME: '진행 중', CODE_ID: 'REQUIREMENT_STATUS_IN_PROGRESS' },
  { CODE: 'REVIEW', CODE_NAME: '검토', CODE_ID: 'REQUIREMENT_STATUS_REVIEW' },
  { CODE: 'APPROVED', CODE_NAME: '승인', CODE_ID: 'REQUIREMENT_STATUS_APPROVED' },
];

interface MaxLengthFieldProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}

function MaxLengthField({ value, maxLength, onChange, multiline = false, rows, required = false, placeholder }: MaxLengthFieldProps) {
  const nextValue = (next: string) => onChange(next.slice(0, maxLength));
  return <span className={`sd-max-length-field${multiline ? ' sd-max-length-field--multiline' : ''}`}>
    {multiline
      ? <textarea rows={rows} required={required} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(event) => nextValue(event.target.value)} />
      : <input required={required} maxLength={maxLength} value={value} placeholder={placeholder} onChange={(event) => nextValue(event.target.value)} />}
    <small aria-live="polite">{value.length}/{maxLength}</small>
  </span>;
}

export default function RequirementIntakePage() {
  const { projectId } = useProjectContext();
  const [rows, setRows] = useState<Requirement[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<RequirementInput>(() => emptyDraft(projectId));
  const [baseline, setBaseline] = useState('');
  const [mode, setMode] = useState<ProjectWorkspaceMode>('DETAIL');
  const [searchCondition, setSearchCondition] = useState(initialSearchCondition);
  const [appliedSearch, setAppliedSearch] = useState(initialSearchCondition);
  const [types, setTypes] = useState<{ CODE: string; CODE_NAME: string }[]>([]);
  const [statuses, setStatuses] = useState(defaultRequirementStatuses);
  const [statusColors, setStatusColors] = useState(new Map<string, string>());
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [relationshipType, setRelationshipType] = useState(relationshipTypes[0]);
  const [analysisRequirementIds, setAnalysisRequirementIds] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState(new Set<string>());
  const [menuRelationSelected, setMenuRelationSelected] = useState(new Set<string>());
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRelations = useGridRowState<MenuRelationRow>(menuRelationKey);
  const replaceMenuRelations = menuRelations.replace;
  const updateMenuRelation = menuRelations.update;
  const menuRelationRows = menuRelations.rows;
  const selected = rows.find((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID === selectedId);
  const connectedRequirements = rows.filter((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID !== selectedId);
  const menuKeys = menuRelationRows.map((row) => row.MENU_KEY).filter(Boolean);
  const draftWithMenuKeys = { ...draft, MENU_KEYS: menuKeys };
  const dirty = baseline !== '' && JSON.stringify(draftWithMenuKeys) !== baseline;
  const pendingLegacy = useMemo(() => legacyRequirements().filter((row) => row.PROJECT_ID === projectId && !rows.some((item) => item.LEGACY_SOURCE_ID === row.REQUIREMENT_ID)), [projectId, rows]);
  const visibleRows = rows.filter((row) => {
    if (row.PROJECT_ID !== projectId) return false;
    const keyword = appliedSearch.keyword.toLowerCase();
    const menuText = row.MENU_KEYS.join(' ').toLowerCase();
    return `${row.REQUIREMENT_ID} ${row.REQUIREMENT_NAME}`.toLowerCase().includes(keyword)
      && (!appliedSearch.menuKeyword || menuText.includes(appliedSearch.menuKeyword.toLowerCase()))
      && (!appliedSearch.requirementType || row.REQUIREMENT_TYPE_CODE === appliedSearch.requirementType)
      && (!appliedSearch.status || row.STATUS === appliedSearch.status);
  });
  const confirmDiscard = () => !dirty || window.confirm('저장하지 않은 변경사항이 있습니다. 변경사항을 버리시겠습니까?');
  const reportAttachmentError = useCallback((text: string) => setMessage({ type: 'error', text }), []);
  const select = (row: Requirement) => {
    const value: RequirementInput = { PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: row.REQUIREMENT_TYPE_CODE, DESCRIPTION: row.DESCRIPTION, PROCESS_DESCRIPTION: row.PROCESS_DESCRIPTION, STATUS: row.STATUS, MENU_KEYS: row.MENU_KEYS };
    setSelectedId(row.REQUIREMENT_ID); setSelectedRowKeys(new Set([row.REQUIREMENT_ID])); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); setAnalysisRequirementIds([]); setMenuRelationSelected(new Set());
    replaceMenuRelations(row.MENU_KEYS.map((key) => ({ MENU_KEY: key, MENU_NAME: key })));
  };
  const load = async (id = '') => {
    if (!projectId) { setRows([]); return; }
    const next = await requirementApi.list(projectId); setRows(next);
    if (id) { const item = next.find((row) => row.REQUIREMENT_ID === id); if (item) select(item); }
  };
  useEffect(() => {
    let current = true;
    if (!projectId) return () => { current = false; };
    requirementApi.list(projectId).then((items) => { if (current) { setRows(items); setSelectedId(''); setSelectedRowKeys(new Set()); setMenuRelationSelected(new Set()); replaceMenuRelations([]); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); } })
      .catch((error: Error) => { if (current) setMessage({ type: 'error', text: error.message }); });
    return () => { current = false; };
  }, [projectId, replaceMenuRelations]);
  useEffect(() => {
    coreCodeApi.findCodes('REQUIREMENT_TYPE_CODE').then(setTypes).catch(() => setMessage({ type: 'error', text: '요구 유형 공통코드를 조회하지 못했습니다.' }));
    Promise.all([coreCodeApi.findCodes('REQUIREMENT_STATUS_CODE', '', 'Y'), coreCodeApi.findAttributeValues('REQUIREMENT_STATUS_CODE')])
      .then(([codes, attributes]) => {
        if (codes.length > 0) setStatuses(codes.map((code) => ({ CODE: code.CODE, CODE_NAME: code.CODE_NAME, CODE_ID: code.CODE_ID })));
        const codeById = new Map(codes.map((code) => [code.CODE_ID, code.CODE]));
        const colors = new Map(attributes.filter((attribute) => attribute.ATTRIBUTE_CODE === 'COLOR').flatMap((attribute) => {
          const code = codeById.get(attribute.CODE_ID);
          return code ? [[code, attribute.ATTRIBUTE_VALUE] as [string, string]] : [];
        }));
        setStatusColors(colors);
      })
      .catch(() => setMessage({ type: 'error', text: '요구사항 상태 공통코드를 조회하지 못했습니다.' }));
  }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const update = <K extends keyof RequirementInput>(key: K, value: RequirementInput[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : '작업을 완료하지 못했습니다.' }); } finally { setBusy(false); } };
  const resetDraft = () => { setSelectedId(''); setSelectedRowKeys(new Set()); setMenuRelationSelected(new Set()); replaceMenuRelations([]); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); setAnalysisRequirementIds([]); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.PROJECT_ID !== projectId) { setMessage({ type: 'warn', text: '프로젝트 변경이 완료된 후 다시 저장하세요.' }); return; }
    if (!draft.REQUIREMENT_NAME.trim()) { setMessage({ type: 'warn', text: '요구사항명을 입력하세요.' }); return; }
    void run(async () => { const payload = { ...draft, MENU_KEYS: menuKeys }; const saved = selectedId ? await requirementApi.update(selectedId, payload) : await requirementApi.create(payload); await load(saved.REQUIREMENT_ID); setMessage({ type: 'success', text: '요구사항을 저장했습니다.' }); });
  };
  const migrate = () => void run(async () => {
    let count = 0;
    for (const row of pendingLegacy) {
      const saved = await requirementApi.create({ PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: 'NEW', DESCRIPTION: row.DESCRIPTION ?? '', PROCESS_DESCRIPTION: '', STATUS: row.STATUS, MENU_KEYS: [], LEGACY_SOURCE_ID: row.REQUIREMENT_ID, LEGACY_WBS_IDS: JSON.stringify(row.WBS_IDS ?? []), LEGACY_SCREEN_IDS: JSON.stringify(row.SCREEN_IDS ?? []), LEGACY_TABLE_IDS: JSON.stringify(row.TABLE_IDS ?? []) });
      if (saved.LEGACY_SOURCE_ID !== row.REQUIREMENT_ID) throw new Error(`${row.REQUIREMENT_ID} 이관 확인에 실패했습니다.`); count += 1;
    }
    await load(); setMessage({ type: 'success', text: `${count}건 이관을 확인했습니다. 기존 브라우저 데이터는 보존됩니다.` });
  });
  void migrate;
  const searchFields = useMemo<SearchFieldConfig<RequirementSearchCondition>[]>(() => [
    { key: 'keyword', label: '요구사항 ID/명', placeholder: 'ID 또는 요구사항명' },
    { key: 'menuKeyword', label: '관련 메뉴', placeholder: '메뉴명 또는 메뉴키' },
    { key: 'requirementType', label: '요구 유형', controlType: 'select', options: [{ value: '', label: '전체' }, ...types.map((type) => ({ value: type.CODE, label: type.CODE_NAME }))] },
    { key: 'status', label: '상태', controlType: 'select', options: [{ value: '', label: '전체' }, ...statuses.map((status) => ({ value: status.CODE, label: status.CODE_NAME }))] },
  ], [statuses, types]);
  const statusLabels = useMemo(() => new Map(statuses.map((status) => [status.CODE, status.CODE_NAME])), [statuses]);
  const requirementColumns = useMemo<DataTableColumn<Requirement>[]>(() => [
    { key: 'REQUIREMENT_NAME', header: '요구사항명', flex: 1, minWidth: 180, render: (row) => row.REQUIREMENT_NAME },
    { key: 'STATUS', header: '상태', width: 120, render: (row) => <StatusColorIndicator label={statusLabels.get(row.STATUS) ?? row.STATUS} color={statusColors.get(row.STATUS) ?? '#64748B'} /> },
    { key: 'REQUIREMENT_ID', header: '요구사항 ID', width: 155, render: (row) => row.REQUIREMENT_ID },
  ], [statusColors, statusLabels]);
  const updateMenuRow = useCallback((row: TrackedGridRow<MenuRelationRow>, field: keyof MenuRelationRow, value: string) => {
    const normalized = value.trim();
    const duplicate = field === 'MENU_KEY' && normalized !== '' && menuRelationRows.some((item) => item.__GRID_ROW_ID !== row.__GRID_ROW_ID && item.MENU_KEY === normalized);
    if (duplicate) {
      setMessage({ type: 'warn', text: '이미 연결된 메뉴입니다.' });
      return;
    }
    updateMenuRelation(row.__GRID_ROW_ID, (current) => ({ ...current, [field]: value }));
  }, [menuRelationRows, updateMenuRelation]);
  const menuRelationColumns = useMemo<DataTableColumn<MenuRelationRow>[]>(() => [
    { key: 'MENU_NAME', header: '메뉴명', flex: 1, minWidth: 180, render: (row) => { const tracked = row as TrackedGridRow<MenuRelationRow>; return tracked.__GRID_ROW_ID.startsWith('NEW_') ? <input className="basekit-grid-input" aria-label="메뉴명" maxLength={200} value={tracked.MENU_NAME} placeholder="메뉴명" onChange={(event) => updateMenuRow(tracked, 'MENU_NAME', event.target.value)} onClick={(event) => event.stopPropagation()} /> : tracked.MENU_NAME; } },
    { key: 'MENU_KEY', header: '메뉴키', width: 190, render: (row) => { const tracked = row as TrackedGridRow<MenuRelationRow>; return tracked.__GRID_ROW_ID.startsWith('NEW_') ? <input className="basekit-grid-input" aria-label="메뉴키" maxLength={100} value={tracked.MENU_KEY} placeholder="메뉴키" onChange={(event) => updateMenuRow(tracked, 'MENU_KEY', event.target.value)} onClick={(event) => event.stopPropagation()} /> : tracked.MENU_KEY; } },
  ], [updateMenuRow]);
  const basicInfo: ReactNode = <div className="standard-design-project-fields standard-design-project-fields--long-text">
    <label><span>요구사항명</span><MaxLengthField required maxLength={200} value={draft.REQUIREMENT_NAME} onChange={(value) => update('REQUIREMENT_NAME', value)} /></label>
    <label><span>요구 유형</span><select value={draft.REQUIREMENT_TYPE_CODE} onChange={(e) => update('REQUIREMENT_TYPE_CODE', e.target.value)}>{types.map((code) => <option key={code.CODE} value={code.CODE}>{code.CODE_NAME}</option>)}</select></label>
    <label><span>상태</span><select value={draft.STATUS} onChange={(e) => update('STATUS', e.target.value)}>{statuses.map((status) => <option key={status.CODE} value={status.CODE}>{status.CODE_NAME}</option>)}</select></label>
    <label className="standard-design-project-description"><span>요구사항 설명</span><MaxLengthField multiline rows={8} maxLength={4000} value={draft.DESCRIPTION} onChange={(value) => update('DESCRIPTION', value)} /></label>
    <label className="standard-design-project-description"><span>프로세스 설명</span><MaxLengthField multiline rows={8} maxLength={4000} value={draft.PROCESS_DESCRIPTION} onChange={(value) => update('PROCESS_DESCRIPTION', value)} /></label>
  </div>;
  const attachmentTab: ReactNode = <RequirementAttachmentPanel requirementId={selectedId} attachments={selected?.ATTACHMENTS ?? []} onUploaded={(file) => { void load(selectedId); setMessage({ type: 'success', text: `${file.ORIGINAL_FILE_NAME}을(를) 업로드했습니다.` }); }} onDeleted={() => { void load(selectedId); setMessage({ type: 'success', text: '첨부파일을 삭제했습니다.' }); }} onError={reportAttachmentError} />;
  const menuTab: ReactNode = <section className="sd-requirement-menu-tab" aria-label="관련 메뉴">
    <div className="sd-requirement-section-heading"><h2>관련 메뉴</h2><span>설계용 메뉴 목록을 직접 입력합니다.</span></div>
    <BaseKitDataGrid
      programKey="SD_REQUIREMENT_DESIGN" roleCode="ADMIN" title="연결된 메뉴"
      columns={menuRelationColumns} rows={menuRelationRows} getRowKey={(row) => row.__GRID_ROW_ID}
      getRowState={menuRelations.getState} selectedRowKeys={menuRelationSelected} onSelectedRowKeysChange={setMenuRelationSelected}
      emptyMessage="연결된 메뉴가 없습니다."
      toolbarActions={[
        { actionCode: 'CREATE', label: '행추가', onClick: () => menuRelations.add({ MENU_KEY: '', MENU_NAME: '' }) },
        { actionCode: 'DELETE', label: '행삭제', tone: 'danger', disabled: menuRelationSelected.size === 0, onClick: () => { menuRelations.remove(menuRelationSelected); setMenuRelationSelected(new Set()); } },
      ]}
    />
  </section>;
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
    { id: 'menus', label: '관련 메뉴', content: menuTab },
    { id: 'analysis', label: 'AI 분석', content: aiTab },
    { id: 'related', label: '연관정보', content: relatedTab },
  ];
  return <div className="page standard-design-page standard-design-project-page sd-requirement-page">
    <PageHeader breadcrumbs={['Standard Design', '요구사항 관리']} rightContent={<div className="standard-design-header-actions"><ProjectContextSelector onSelected={() => confirmDiscard()} /><div className="standard-design-lifecycle-actions" aria-label="요구사항 기능">
      <ActionButton display="text" actionCode="CREATE" label="등록" tone="primary" disabled={busy || !projectId} onClick={() => { if (confirmDiscard()) resetDraft(); }} />
      <ActionButton display="text" actionCode="SAVE" label="저장" tone="primary" htmlType="submit" form="requirement-detail-form" disabled={busy || !projectId} onClick={() => undefined} />
      <ActionButton display="text" actionCode="DELETE" label="삭제" tone="danger" disabled={busy || !selectedId} onClick={() => { if (selectedId && window.confirm('선택한 요구사항과 첨부파일을 삭제하시겠습니까?')) void run(async () => { await requirementApi.delete(selectedId); resetDraft(); await load(); setMessage({ type: 'success', text: '요구사항을 삭제했습니다.' }); }); }} />
    </div></div>} />
    {!projectId ? <p className="sd-project-empty-help">프로젝트 Context를 선택하세요.</p> : <div className="sd-requirement-workspace-shell">
      <ProjectListDetailWorkspace subject="요구사항" mode={mode} onModeChange={setMode}
        list={<div className="project-list-detail-workspace__list-content">
      {mode === 'LIST' || searchOpen ? <div id="requirement-inline-search" className="project-inline-search"><SearchPanel rows={1} actionDisplay="label" fields={searchFields} value={searchCondition} initialValue={initialSearchCondition} onValueChange={setSearchCondition} onSearch={setAppliedSearch} onReset={(value) => { setSearchCondition(value); setAppliedSearch(value); }} /></div> : null}
          {mode !== 'LIST' ? <div className="project-master-heading"><h2>요구사항 목록 <span>({visibleRows.length}건)</span></h2><button type="button" className="secondary-button" aria-expanded={searchOpen} aria-controls="requirement-inline-search" onClick={() => setSearchOpen((open) => !open)}>검색</button></div> : null}
          <BaseKitDataGrid programKey="SD_REQUIREMENT_DESIGN" roleCode="ADMIN" title={mode === 'LIST' ? '요구사항 목록' : undefined} columns={requirementColumns} rows={visibleRows} getRowKey={(row) => row.REQUIREMENT_ID} selectedRowKeys={selectedRowKeys} onSelectedRowKeysChange={setSelectedRowKeys} currentRowKey={selectedId} onRowClick={(row) => { if (confirmDiscard()) select(row); }} emptyMessage="조회 조건에 맞는 요구사항이 없습니다." loading={busy} enabledActions={[]} />
        </div>}
        detail={<div className="sd-requirement-detail"><form id="requirement-detail-form" className="standard-design-lifecycle-form standard-design-project-form" onSubmit={save}><div className="standard-design-project-detail-heading"><h2>{selectedId ? '요구사항 상세' : '신규 요구사항'}</h2><dl className="standard-design-project-id"><div><dt>ID</dt><dd>{selectedId || '신규 저장 시 생성'}</dd></div></dl></div><BaseTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} ariaLabel="요구사항 상세" /></form></div>}
      />
      <div className="sd-requirement-message-area" aria-live="polite">
        {message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}
      </div>
    </div>}
  </div>;
}
