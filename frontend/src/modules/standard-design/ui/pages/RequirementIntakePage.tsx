import FormField from '../../../../components/common/FormField';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ActionButton, BaseKitMessage, BaseTabs, ExcelImportDialog, PageHeader, SearchPanel, downloadExcelTemplate, type BaseTabDefinition, type DataTableColumn, type SearchFieldConfig } from '../../../../components/common';
import { COMMON_ACTIONS } from '../../../../constants/actionCodes';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import { StatusColorIndicator } from '../../../../components/grid/gridCellComponents';
import { useGridRowState } from '../../../../components/grid/gridRowState';
import { coreCodeApi } from '../../../../services/coreCodeApi';
import ProjectListDetailWorkspace, { type ProjectWorkspaceMode } from '../components/ProjectListDetailWorkspace';
import ProjectContextSelector from '../components/ProjectContextSelector';
import RequirementAttachmentPanel from '../components/RequirementAttachmentPanel';
import { useProjectContext } from '../components/useProjectContext';
import { requirementApi, type Requirement, type RequirementInput } from '../../requirement/requirementApi';
import { projectMenuApi, type ProjectMenu } from '../../projectmenu/projectMenuApi';
import { createRequirementExcelMapper, createRequirementExcelValidator, planRequirementImport, requirementExcelColumns, requirementImportKey } from '../../requirement/requirementExcel';

const emptyDraft = (projectId: string): RequirementInput => ({ PROJECT_ID: projectId, REQUIREMENT_NAME: '', REQUIREMENT_TYPE_CODE: 'NEW', DESCRIPTION: '', PROCESS_DESCRIPTION: '', DESIGN_OPINION: '', STATUS: 'DRAFT', MENU_KEYS: [], PROJECT_MENU_IDS: [] });
const legacyKey = 'basekit.standard-design.lifecycle.v1';
interface LegacyRequirement { REQUIREMENT_ID: string; PROJECT_ID: string; REQUIREMENT_NAME: string; DESCRIPTION: string; STATUS: string; WBS_IDS?: string[]; SCREEN_IDS?: string[]; TABLE_IDS?: string[] }
function legacyRequirements(): LegacyRequirement[] {
  try { return (JSON.parse(localStorage.getItem(legacyKey) ?? '{}') as { requirements?: LegacyRequirement[] }).requirements ?? []; } catch { return []; }
}
interface RequirementSearchCondition { keyword: string; menuKeyword: string; requirementType: string; status: string }
interface MenuRelationRow { PROJECT_MENU_ID: string; MENU_ID: string; MENU_NAME: string; LEVEL1_MENU_ID: string | null }
const initialSearchCondition: RequirementSearchCondition = { keyword: '', menuKeyword: '', requirementType: '', status: '' };
const menuRelationKey = (row: MenuRelationRow) => row.PROJECT_MENU_ID;
const defaultRequirementStatuses = [
  { CODE: 'DRAFT', CODE_NAME: '초안', CODE_ID: 'REQUIREMENT_STATUS_DRAFT' },
  { CODE: 'IN_PROGRESS', CODE_NAME: '진행 중', CODE_ID: 'REQUIREMENT_STATUS_IN_PROGRESS' },
  { CODE: 'REVIEW', CODE_NAME: '검토', CODE_ID: 'REQUIREMENT_STATUS_REVIEW' },
  { CODE: 'APPROVED', CODE_NAME: '승인', CODE_ID: 'REQUIREMENT_STATUS_APPROVED' },
];
const formatRequirementDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

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
  const [selectedRowKeys, setSelectedRowKeys] = useState(new Set<string>());
  const [menuRelationSelected, setMenuRelationSelected] = useState(new Set<string>());
  const [legacyMenuKeys, setLegacyMenuKeys] = useState<string[]>([]);
  const [projectMenus, setProjectMenus] = useState<ProjectMenu[]>([]);
  const [projectMenuSearch, setProjectMenuSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const menuRelations = useGridRowState<MenuRelationRow>(menuRelationKey);
  const replaceMenuRelations = menuRelations.replace;
  const menuRelationRows = menuRelations.rows;
  const selected = rows.find((row) => row.PROJECT_ID === projectId && row.REQUIREMENT_ID === selectedId);
  const projectMenuIds = menuRelationRows.filter((row) => menuRelations.getState(row) !== 'DELETED').map((row) => row.PROJECT_MENU_ID).filter((id) => !id.startsWith('NEW_'));
  const draftWithMenuKeys = { ...draft, MENU_KEYS: legacyMenuKeys, PROJECT_MENU_IDS: projectMenuIds };
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
    const value: RequirementInput = { PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: row.REQUIREMENT_TYPE_CODE, DESCRIPTION: row.DESCRIPTION, PROCESS_DESCRIPTION: row.PROCESS_DESCRIPTION, DESIGN_OPINION: row.DESIGN_OPINION ?? '', STATUS: row.STATUS, MENU_KEYS: row.MENU_KEYS, PROJECT_MENU_IDS: row.PROJECT_MENU_IDS ?? [] };
    setSelectedId(row.REQUIREMENT_ID); setSelectedRowKeys(new Set([row.REQUIREMENT_ID])); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); setMenuRelationSelected(new Set());
    setLegacyMenuKeys(row.MENU_KEYS);
    replaceMenuRelations(row.PROJECT_MENU_IDS.map((id) => { const item = projectMenus.find((menu) => menu.PROJECT_MENU_ID === id); return item ? { PROJECT_MENU_ID: item.PROJECT_MENU_ID, MENU_ID: item.MENU_ID, MENU_NAME: item.MENU_NAME, LEVEL1_MENU_ID: item.LEVEL1_MENU_ID } : { PROJECT_MENU_ID: id, MENU_ID: id, MENU_NAME: '프로젝트 메뉴를 찾을 수 없음', LEVEL1_MENU_ID: null }; }));
  };
  const load = async (id = '') => {
    if (!projectId) { setRows([]); return; }
    const next = await requirementApi.list(projectId); setRows(next);
    if (id) { const item = next.find((row) => row.REQUIREMENT_ID === id); if (item) select(item); }
  };
  useEffect(() => {
    let current = true;
    if (!projectId) return () => { current = false; };
    Promise.all([requirementApi.list(projectId), projectMenuApi.list(projectId)]).then(([items, menuPage]) => { if (current) { setRows(items); setProjectMenus(menuPage.ITEMS); setSelectedId(''); setSelectedRowKeys(new Set()); setMenuRelationSelected(new Set()); setLegacyMenuKeys([]); replaceMenuRelations([]); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); } })
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
  const resetDraft = () => { setSelectedId(''); setSelectedRowKeys(new Set()); setMenuRelationSelected(new Set()); setLegacyMenuKeys([]); replaceMenuRelations([]); const value = emptyDraft(projectId); setDraft(value); setBaseline(JSON.stringify(value)); setActiveTab('basic'); };
  const excelContext = { projectId, types, statuses, projectMenus };
  const importedKeys = useRef(new Set<string>());
  const importRequirements = async (items: RequirementInput[]) => {
    const plan = planRequirementImport(items, rows.map((row) => row.REQUIREMENT_NAME), importedKeys.current);
    if (plan.duplicateNames.length > 0 && !window.confirm(`같은 이름의 요구사항이 이미 있거나 파일 안에 중복되어 있습니다(${plan.duplicateNames.length}건: ${plan.duplicateNames.slice(0, 3).join(', ')}${plan.duplicateNames.length > 3 ? ' 외' : ''}).\nExcel Import는 항상 신규 등록하며 기존 요구사항을 덮어쓰지 않습니다. 계속 등록하시겠습니까?`)) {
      throw new Error('중복 가능 요구사항 확인에서 취소하여 등록하지 않았습니다.');
    }
    let created = 0;
    for (const item of plan.toCreate) {
      try { await requirementApi.create(item); importedKeys.current.add(requirementImportKey(item)); created += 1; }
      catch (error) {
        await load(selectedId);
        throw new Error(`${plan.skippedAlreadyCreated + created}/${items.length}건 저장 후 '${item.REQUIREMENT_NAME}'에서 중단되었습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}. 저장된 건은 유지되며, 같은 파일로 Import를 다시 누르면 저장된 건은 건너뛰고 나머지만 등록합니다.`, { cause: error });
      }
    }
    importedKeys.current.clear();
    await load(selectedId);
    setMessage({ type: 'success', text: `Excel에서 요구사항 ${plan.skippedAlreadyCreated + created}건을 신규 등록했습니다.${plan.skippedAlreadyCreated ? ` (이전 시도에서 저장된 ${plan.skippedAlreadyCreated}건 포함)` : ''}` });
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.PROJECT_ID !== projectId) { setMessage({ type: 'warn', text: '프로젝트 변경이 완료된 후 다시 저장하세요.' }); return; }
    if (!draft.REQUIREMENT_NAME.trim()) { setMessage({ type: 'warn', text: '요구사항명을 입력하세요.' }); return; }
    if (!draft.DESCRIPTION.trim()) { setMessage({ type: 'warn', text: '요구사항 내용을 입력하세요.' }); return; }
    void run(async () => { const payload = { ...draft, MENU_KEYS: legacyMenuKeys, PROJECT_MENU_IDS: projectMenuIds }; const saved = selectedId ? await requirementApi.update(selectedId, payload) : await requirementApi.create(payload); await load(saved.REQUIREMENT_ID); setMessage({ type: 'success', text: '요구사항을 저장했습니다.' }); });
  };
  const migrate = () => void run(async () => {
    let count = 0;
    for (const row of pendingLegacy) {
      const saved = await requirementApi.create({ PROJECT_ID: row.PROJECT_ID, REQUIREMENT_NAME: row.REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE: 'NEW', DESCRIPTION: row.DESCRIPTION ?? '', PROCESS_DESCRIPTION: '', DESIGN_OPINION: '', STATUS: row.STATUS, MENU_KEYS: [], PROJECT_MENU_IDS: [], LEGACY_SOURCE_ID: row.REQUIREMENT_ID, LEGACY_WBS_IDS: JSON.stringify(row.WBS_IDS ?? []), LEGACY_SCREEN_IDS: JSON.stringify(row.SCREEN_IDS ?? []), LEGACY_TABLE_IDS: JSON.stringify(row.TABLE_IDS ?? []) });
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
    { key: 'REQUIREMENT_TYPE_CODE', header: '요구 유형', width: 120, render: (row) => types.find((type) => type.CODE === row.REQUIREMENT_TYPE_CODE)?.CODE_NAME ?? row.REQUIREMENT_TYPE_CODE },
    { key: 'MENU_KEYS', header: '관련 메뉴', flex: 1, minWidth: 180, render: (row) => row.MENU_KEYS.length ? row.MENU_KEYS.join(', ') : '-' },
    { key: 'MOD_DT', header: '수정일', width: 110, render: (row) => formatRequirementDate(row.MOD_DT) },
    { key: 'REQUIREMENT_ID', header: '요구사항 ID', width: 155, render: (row) => row.REQUIREMENT_ID },
  ], [statusColors, statusLabels, types]);
  const addProjectMenu = (id: string) => {
    const item = projectMenus.find((menu) => menu.PROJECT_MENU_ID === id);
    if (!item || menuRelationRows.some((row) => row.PROJECT_MENU_ID === id)) { setMessage({ type: 'warn', text: '이미 연결된 메뉴이거나 선택할 수 없는 메뉴입니다.' }); return; }
    replaceMenuRelations(menuRelationRows.filter((row) => menuRelations.getState(row) !== 'DELETED').map((row) => ({ PROJECT_MENU_ID: row.PROJECT_MENU_ID, MENU_ID: row.MENU_ID, MENU_NAME: row.MENU_NAME, LEVEL1_MENU_ID: row.LEVEL1_MENU_ID })).concat({ PROJECT_MENU_ID: item.PROJECT_MENU_ID, MENU_ID: item.MENU_ID, MENU_NAME: item.MENU_NAME, LEVEL1_MENU_ID: item.LEVEL1_MENU_ID }));
    setProjectMenuSearch('');
  };
  const menuRelationColumns = useMemo<DataTableColumn<MenuRelationRow>[]>(() => [
    { key: 'MENU_NAME', header: '메뉴명', flex: 1, minWidth: 180, render: (row) => row.MENU_NAME },
    { key: 'MENU_ID', header: '메뉴 ID', width: 190, render: (row) => row.MENU_ID },
    { key: 'LEVEL1_MENU_ID', header: '1레벨 메뉴', width: 180, render: (row) => row.LEVEL1_MENU_ID ?? '-' },
  ], []);
  const filteredProjectMenus = projectMenus.filter((menu) => !menuRelationRows.some((row) => row.PROJECT_MENU_ID === menu.PROJECT_MENU_ID)
    && (!projectMenuSearch.trim() || `${menu.MENU_ID} ${menu.MENU_NAME}`.toLocaleLowerCase().includes(projectMenuSearch.trim().toLocaleLowerCase())));
  const basicInfo: ReactNode = <div className="standard-form-layout standard-design-project-fields standard-design-project-fields--long-text">
    <FormField label="요구사항명" required labelPosition="TOP" className="standard-design-project-description"><MaxLengthField required maxLength={200} value={draft.REQUIREMENT_NAME} onChange={(value) => update('REQUIREMENT_NAME', value)} /></FormField>
    <FormField label="요구 유형"><select value={draft.REQUIREMENT_TYPE_CODE} onChange={(e) => update('REQUIREMENT_TYPE_CODE', e.target.value)}>{types.map((code) => <option key={code.CODE} value={code.CODE}>{code.CODE_NAME}</option>)}</select></FormField>
    <FormField label="상태"><select value={draft.STATUS} onChange={(e) => update('STATUS', e.target.value)}>{statuses.map((status) => <option key={status.CODE} value={status.CODE}>{status.CODE_NAME}</option>)}</select></FormField>
    <FormField label="요구사항 내용" required labelPosition="TOP" className="standard-design-project-description"><MaxLengthField required multiline rows={8} maxLength={4000} value={draft.DESCRIPTION} onChange={(value) => update('DESCRIPTION', value)} /></FormField>
    <FormField label="프로세스 설명" labelPosition="TOP" className="standard-design-project-description"><MaxLengthField multiline rows={8} maxLength={4000} value={draft.PROCESS_DESCRIPTION} onChange={(value) => update('PROCESS_DESCRIPTION', value)} /></FormField>
    <FormField label="설계 의견" labelPosition="TOP" className="standard-design-project-description"><MaxLengthField multiline rows={6} maxLength={10000} value={draft.DESIGN_OPINION ?? ''} onChange={(value) => update('DESIGN_OPINION', value)} /></FormField>
  </div>;
  const attachmentTab: ReactNode = <RequirementAttachmentPanel requirementId={selectedId} attachments={selected?.ATTACHMENTS ?? []} onUploaded={(file) => { void load(selectedId); setMessage({ type: 'success', text: `${file.ORIGINAL_FILE_NAME}을(를) 업로드했습니다.` }); }} onDeleted={() => { void load(selectedId); setMessage({ type: 'success', text: '첨부파일을 삭제했습니다.' }); }} onError={reportAttachmentError} />;
  const menuTab: ReactNode = <section className="sd-requirement-menu-tab" aria-label="관련 메뉴">
    <div className="sd-requirement-section-heading"><h2>관련 Project Menu</h2><span>현재 프로젝트의 Project Menu를 요구사항에 연결합니다. 기존 시스템 메뉴 키 관계는 보존됩니다.</span></div>
    <div className="sd-requirement-menu-picker"><input aria-label="Project Menu 검색" value={projectMenuSearch} placeholder="Project Menu ID 또는 메뉴명" onChange={(event) => setProjectMenuSearch(event.target.value)} /><select aria-label="Project Menu 선택" value="" onChange={(event) => addProjectMenu(event.target.value)}><option value="">메뉴를 선택하세요</option>{filteredProjectMenus.map((menu) => <option key={menu.PROJECT_MENU_ID} value={menu.PROJECT_MENU_ID}>{menu.MENU_NAME} ({menu.MENU_ID})</option>)}</select><span>{filteredProjectMenus.length}건</span></div>
    {legacyMenuKeys.length ? <div className="sd-requirement-legacy-menu-note">기존 시스템 메뉴 관계: {legacyMenuKeys.join(', ')} (자동 삭제하지 않음)</div> : null}
    <BaseKitDataGrid
      programKey="SD_REQUIREMENT_DESIGN" roleCode="ADMIN" title="연결된 메뉴"
      columns={menuRelationColumns} rows={menuRelationRows} getRowKey={(row) => row.__GRID_ROW_ID}
      getRowState={menuRelations.getState} selectedRowKeys={menuRelationSelected} onSelectedRowKeysChange={setMenuRelationSelected}
      emptyMessage="연결된 메뉴가 없습니다."
      toolbarActions={[
        { actionCode: 'DELETE', label: '행삭제', tone: 'danger', disabled: menuRelationSelected.size === 0, onClick: () => { menuRelations.remove(menuRelationSelected); setMenuRelationSelected(new Set()); } },
      ]}
    />
  </section>;
  // KEEP: RequirementAnalysisPanel and analysis backend/API/state/tests are preserved for the future requirement group analysis menu.
  const relatedTab: ReactNode = <section className="base-tab-placeholder" aria-label="연관정보 준비 영역">
    <h3>연관정보</h3>
    <p>요구사항 관계와 설계 Traceability를 표시할 준비 영역입니다. 현재는 별도 관계 데이터를 저장하지 않습니다.</p>
    <div className="base-tab-placeholder__grid"><div className="base-tab-placeholder"><h3>Requirement 관계</h3><p>{selectedId ? '저장된 관계 데이터가 없습니다.' : '요구사항을 저장하면 관계를 확인할 수 있습니다.'}</p></div><div className="base-tab-placeholder"><h3>설계 Traceability</h3><p>Requirement → WBS → Screen → Table 연결은 후속 설계 단계에서 관리됩니다.</p></div></div>
  </section>;
  const historyTab: ReactNode = <section className="base-tab-placeholder" aria-label="변경이력 준비 영역">
    <h3>변경이력</h3>
    <p>회의·협의·결정에 따른 변경 기록은 별도 History 기능으로 연결할 예정입니다.</p>
  </section>;
  const tabs: BaseTabDefinition[] = [
    { id: 'basic', label: '기본정보', content: basicInfo },
    { id: 'history', label: '변경이력', content: historyTab },
    { id: 'attachments', label: '첨부/미리보기', content: attachmentTab },
    { id: 'menus', label: '관련 메뉴', content: menuTab },
    { id: 'related', label: '연관정보', content: relatedTab },
  ];
  return <div className="page standard-design-page standard-design-project-page sd-requirement-page">
    <PageHeader breadcrumbs={['Standard Design', '요구사항 관리']} rightContent={<div className="standard-design-header-actions"><ProjectContextSelector onSelected={() => confirmDiscard()} /><div className="standard-design-lifecycle-actions" aria-label="요구사항 기능">
      <ActionButton display="text" actionCode="CREATE" label="등록" tone="primary" disabled={busy || !projectId} onClick={() => { if (confirmDiscard()) resetDraft(); }} />
      <ActionButton display="text" actionCode="SAVE" label="저장" tone="primary" htmlType="submit" form="requirement-detail-form" disabled={busy || !projectId} onClick={() => undefined} />
      <ActionButton display="text" actionCode="DELETE" label="삭제" tone="danger" disabled={busy || !selectedId} onClick={() => { if (selectedId && window.confirm('선택한 요구사항과 첨부파일을 삭제하시겠습니까?')) void run(async () => { await requirementApi.delete(selectedId); resetDraft(); await load(); setMessage({ type: 'success', text: '요구사항을 삭제했습니다.' }); }); }} />
    </div></div>} />
    {!projectId ? <p className="sd-project-empty-help">프로젝트 Context를 선택하세요.</p> : <div className="sd-requirement-workspace-shell">
      <ProjectListDetailWorkspace subject="요구사항" initialListWidthPercent={55} mode={mode} onModeChange={setMode}
        list={<div className="project-list-detail-workspace__list-content">
      {mode === 'LIST' || searchOpen ? <div id="requirement-inline-search" className="project-inline-search"><SearchPanel rows={1} actionDisplay="label" fields={searchFields} value={searchCondition} initialValue={initialSearchCondition} onValueChange={setSearchCondition} onSearch={setAppliedSearch} onReset={(value) => { setSearchCondition(value); setAppliedSearch(value); }} /></div> : null}
          {mode !== 'LIST' ? <div className="project-master-heading project-master-heading--search-toggle"><span /><button type="button" className="secondary-button" aria-expanded={searchOpen} aria-controls="requirement-inline-search" onClick={() => setSearchOpen((open) => !open)}>검색</button></div> : null}
          <BaseKitDataGrid programKey="SD_REQUIREMENT_DESIGN" roleCode="ADMIN" title="요구사항 목록" columns={requirementColumns} rows={visibleRows} getRowKey={(row) => row.REQUIREMENT_ID} selectedRowKeys={selectedRowKeys} onSelectedRowKeysChange={setSelectedRowKeys} currentRowKey={selectedId} onRowClick={(row) => { if (confirmDiscard()) select(row); }} emptyMessage="조회 조건에 맞는 요구사항이 없습니다." loading={busy} enabledActions={[]} toolbarActions={[
            { actionCode: COMMON_ACTIONS.EXCEL_DOWNLOAD, label: 'Excel 양식', onClick: () => downloadExcelTemplate(requirementExcelColumns, 'requirement-import-template.xlsx') },
            { actionCode: COMMON_ACTIONS.EXCEL_UPLOAD, label: 'Excel 가져오기', disabled: busy, onClick: () => setExcelOpen(true) },
          ]} />
          <ExcelImportDialog open={excelOpen} columns={requirementExcelColumns} validateRow={createRequirementExcelValidator(excelContext)} mapRow={createRequirementExcelMapper(excelContext)} onImport={importRequirements} onClose={() => { importedKeys.current.clear(); setExcelOpen(false); }} />
        </div>}
        detail={<div className="sd-requirement-detail"><form id="requirement-detail-form" className="standard-design-lifecycle-form standard-design-project-form" onSubmit={save}><div className="standard-design-project-detail-heading"><h2>{selectedId ? '요구사항 상세' : '신규 요구사항'}</h2><dl className="standard-design-project-id"><div><dt>ID</dt><dd>{selectedId || '신규 저장 시 생성'}</dd></div></dl></div><BaseTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} ariaLabel="요구사항 상세" /></form></div>}
      />
      <div className="sd-requirement-message-area" aria-live="polite">
        {message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}
      </div>
    </div>}
  </div>;
}
