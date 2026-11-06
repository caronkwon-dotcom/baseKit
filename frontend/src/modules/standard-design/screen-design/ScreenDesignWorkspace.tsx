import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActionButton, BaseKitMessage, BaseTabs, FormModal, MasterDetailMultiGrid, SearchPanel, type BaseKitMessageType, type DataTableColumn, type SearchFieldConfig } from '../../../components/common';
import { canUseGridAction } from '../../../components/common/gridActionPermission';
import BaseKitDataGrid from '../../../components/grid/BaseKitDataGrid';
import { useGridRowState, type TrackedGridRow } from '../../../components/grid/gridRowState';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { hasAction, programByKey } from '../../../repositories/metadataRepository';
import { requirementGroupApi } from '../requirementgroup/requirementGroupApi';
import { designProgramApi, type DesignProgram } from '../programs/designProgramApi';
import { programKindLabel } from '../programs/programKind';
import { getProjects } from '../projects/projectStore';
import {
  ACTION_DEFS, ALIGNS, ALIGN_LABELS, CONTROL_LABELS, CONTROL_TYPES, DATA_TYPES, DATA_TYPE_LABELS, LEAVE_BLOCKED_MESSAGE, SCREEN_TYPES, SCREEN_TYPE_LABELS, STATUS_LABELS,
  buildProgramRows, buttonState, cloneDesign, defaultAlign, emptyDesign, filterProgramRows, initialSearch, isDesignChanged, leaveBlocked, newColumn, newDetailField, newSearchField, toPayload, validateDesign,
  type Align, type ColumnRow, type ControlType, type DataType, type DesignBody, type DesignStatus, type FieldRow, type FunctionSpec, type ProgramRow, type ScreenDesignRecord, type ScreenDesignSummary, type ScreenType, type SearchCondition, type TabId,
} from './screenDesign';
import { screenDesignApi } from './screenDesignApi';
import { docFileName, evidenceFromProgram, renderDesignDocument } from './designDocument';
import { downloadTextFile } from './downloadFile';
import { linesToText, newFunctionSpec, textToLines, uncoveredRequirements } from './functionSpec';
import './screenDesign.css';

export const AI_DRAFT_ACTION = 'SD_SCREEN_AI_DRAFT';
export const EXPORT_ACTION = 'SD_SCREEN_DOC_EXPORT';
const fieldKey = (row: { FIELD_ID: string }) => row.FIELD_ID;
const specKey = (row: { FUNCTION_ID: string }) => row.FUNCTION_ID;
interface FunctionDraft { id: string; name: string; action: string; description: string; rules: string; validations: string; acceptance: string; requirements: string[] }
const rowId = (row: { __GRID_ROW_ID: string }) => row.__GRID_ROW_ID;
const badge = (label: string, tone?: 'info' | 'warn') => <span className={`metadata-badge${tone ? ` ${tone}` : ''}`}>{label}</span>;
const statusBadge = (status: DesignStatus) => badge(STATUS_LABELS[status], status === 'DRAFT' ? 'warn' : status === 'CONFIRMED' ? 'info' : undefined);
const sourceBadge = (source: string) => badge(source === 'AI' ? 'AI 제안' : '직접', source === 'AI' ? 'info' : undefined);
interface Message { type: BaseKitMessageType; text: string }

function plain<T extends { __GRID_ROW_ID: string }>(rows: T[], deleted: (row: T) => boolean): Omit<T, '__GRID_ROW_ID'>[] {
  return rows.filter(row => !deleted(row)).map(row => { const { __GRID_ROW_ID: id, ...rest } = row; void id; return rest; });
}

interface Props {
  projectId: string;
  /** Opens the program ledger (kept outside so this workspace does not depend on routes). */
  onOpenRegister?: () => void;
  programKey?: string;
  roleCode?: string;
}

/** Master/detail screen design for one project: program list on the left, editable UI design on the right. */
export default function ScreenDesignWorkspace({ projectId, onOpenRegister, programKey = 'SD_SCREEN_DESIGN', roleCode = 'ADMIN' }: Props) {
  const [programs, setPrograms] = useState<DesignProgram[]>([]);
  const [summaries, setSummaries] = useState<ScreenDesignSummary[]>([]);
  const [groupNames, setGroupNames] = useState(new Map<string, string>());
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<SearchCondition>(initialSearch);
  const [applied, setApplied] = useState<SearchCondition>(initialSearch);
  const [selectedId, setSelectedId] = useState('');
  const [record, setRecord] = useState<ScreenDesignRecord | null>(null);
  const [working, setWorking] = useState(false);
  const [screenType, setScreenType] = useState<ScreenType>('GRID_DETAIL');
  const [actions, setActions] = useState<string[]>([]);
  const [tab, setTab] = useState<TabId>('search');
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set<string>());
  const searchRows = useGridRowState<FieldRow>(fieldKey);
  const columnRows = useGridRowState<ColumnRow>(fieldKey);
  const detailRows = useGridRowState<FieldRow>(fieldKey);
  const functionRows = useGridRowState<FunctionSpec>(specKey);
  const [editing, setEditing] = useState<FunctionDraft | null>(null);
  const { replace: replaceSearch, add: addSearch } = searchRows;
  const { replace: replaceColumns, add: addColumn } = columnRows;
  const { replace: replaceDetail, add: addDetail } = detailRows;
  const { replace: replaceFunctions, add: addFunction } = functionRows;

  const program = programs.find(item => item.PROGRAM_ID === selectedId) ?? null;
  const allowed = useCallback((code: string) => canUseGridAction(code, programByKey[programKey]?.actionCodes ?? [], action => hasAction(roleCode, programKey, action)), [programKey, roleCode]);

  const refreshSummaries = useCallback(async () => { try { setSummaries(await screenDesignApi.summaries(projectId)); } catch { /* The list keeps its last statuses. */ } }, [projectId]);
  const fetchAll = useCallback(async () => {
    const [rows, designs, groups] = await Promise.all([designProgramApi.list(projectId), screenDesignApi.summaries(projectId), requirementGroupApi.list(projectId).catch(() => [])]);
    return { rows, designs, names: new Map(groups.map(group => [group.REQUIREMENT_GROUP_ID, group.REQUIREMENT_GROUP_NAME] as [string, string])) };
  }, [projectId]);
  const showAll = useCallback((data: Awaited<ReturnType<typeof fetchAll>>) => { setPrograms(data.rows); setSummaries(data.designs); setGroupNames(data.names); }, []);
  const failAll = (error: unknown) => setMessage({ type: 'error', text: error instanceof Error ? error.message : '프로그램 목록을 조회하지 못했습니다.' });
  useEffect(() => {
    let active = true;
    fetchAll().then(data => { if (active) showAll(data); }).catch(error => { if (active) failAll(error); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchAll, showAll]);
  const reload = () => { setLoading(true); fetchAll().then(showAll).catch(failAll).finally(() => setLoading(false)); };

  const loadEditor = useCallback((design: DesignBody | null, isWorking: boolean) => {
    setWorking(isWorking); setScreenType(design?.SCREEN_TYPE ?? 'GRID_DETAIL'); setActions(design?.ACTION_CODES ?? []);
    replaceSearch(design?.SEARCH_FIELDS ?? []); replaceColumns(design?.GRID_COLUMNS ?? []); replaceDetail(design?.DETAIL_FIELDS ?? []);
    replaceFunctions(design?.FUNCTION_SPECS ?? []);
    setSelectedRows(new Set());
  }, [replaceSearch, replaceColumns, replaceDetail, replaceFunctions]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    screenDesignApi.get(projectId, selectedId)
      .then(found => { if (active) { setRecord(found); loadEditor(found ? cloneDesign(found.DESIGN) : null, Boolean(found)); } })
      .catch(error => { if (active) setMessage({ type: 'error', text: error instanceof Error ? error.message : '화면 설계를 조회하지 못했습니다.' }); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [projectId, selectedId, loadEditor]);

  const current = useMemo<DesignBody | null>(() => working ? {
    SCREEN_TYPE: screenType, ACTION_CODES: actions,
    SEARCH_FIELDS: plain(searchRows.rows, row => searchRows.getState(row) === 'DELETED') as FieldRow[],
    GRID_COLUMNS: plain(columnRows.rows, row => columnRows.getState(row) === 'DELETED') as ColumnRow[],
    DETAIL_FIELDS: plain(detailRows.rows, row => detailRows.getState(row) === 'DELETED') as FieldRow[],
    FUNCTION_SPECS: plain(functionRows.rows, row => functionRows.getState(row) === 'DELETED') as FunctionSpec[],
  } : null, [working, screenType, actions, searchRows, columnRows, detailRows, functionRows]);
  const evidenceIds = useMemo(() => program?.EVIDENCE.map(item => item.REQUIREMENT_ID) ?? [], [program]);
  const dirty = isDesignChanged(current, record?.DESIGN ?? null);
  const status: DesignStatus = record?.DESIGN_STATUS ?? 'NONE';
  const buttons = buttonState({ hasDesign: working, saved: Boolean(record), dirty, status, busy: busy || detailLoading });
  const canExport = Boolean(record) && !dirty && !busy && !detailLoading;

  const programRows = useMemo(() => buildProgramRows(programs, summaries, groupNames), [programs, summaries, groupNames]);
  const visibleRows = useMemo(() => filterProgramRows(programRows, applied), [programRows, applied]);
  const groupOptions = useMemo(() => [
    { value: '', label: '전체' },
    ...[...new Set(programs.map(item => item.SOURCE_GROUP_ID).filter((id): id is string => Boolean(id)))].map(id => ({ value: id, label: groupNames.get(id) ?? id })),
    { value: 'MANUAL', label: '수동 추가' },
  ], [programs, groupNames]);
  const searchFields: SearchFieldConfig<SearchCondition>[] = [
    { key: 'keyword', label: '프로그램명', placeholder: '프로그램명' },
    { key: 'group', label: '출처 그룹', controlType: 'select', options: groupOptions },
    { key: 'status', label: '설계상태', controlType: 'select', options: [{ value: '', label: '전체' }, { value: 'NONE', label: '미설계' }, { value: 'DRAFT', label: '초안' }, { value: 'CONFIRMED', label: '확정' }] },
  ];

  const pick = (id: string) => {
    if (id === selectedId) return;
    if (leaveBlocked(dirty)) { setMessage({ type: 'warn', text: LEAVE_BLOCKED_MESSAGE }); return; }
    setMessage(null); setDetailLoading(true); setRecord(null); loadEditor(null, false); setSelectedId(id); setTab('search');
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : '작업을 완료하지 못했습니다.' }); } finally { setBusy(false); }
  };
  const apply = async (saved: ScreenDesignRecord, text: string, type: BaseKitMessageType = 'success') => {
    setRecord(saved); loadEditor(cloneDesign(saved.DESIGN), true); await refreshSummaries(); setMessage({ type, text });
  };
  const save = () => void run(async () => {
    if (!current) return;
    const problem = validateDesign(current, evidenceIds);
    if (problem) { setMessage({ type: 'warn', text: problem }); return; }
    await apply(await screenDesignApi.save(projectId, selectedId, toPayload(current), record?.VERSION), '화면 설계를 저장했습니다.');
  });
  const confirm = () => void run(async () => {
    if (!record) return;
    const confirmed = await screenDesignApi.confirm(projectId, selectedId, record.VERSION);
    const specs = confirmed.DESIGN.FUNCTION_SPECS;
    const missing = uncoveredRequirements(specs, evidenceIds);
    const done = `설계를 확정했습니다. (설계 v${confirmed.VERSION})`;
    if (!specs.length) await apply(confirmed, `${done} 다만 기능 요건이 없습니다. 설계서의 기능 요건 장이 비어 있으니 작성을 권장합니다.`, 'warn');
    else if (missing.length) await apply(confirmed, `${done} 다만 어떤 기능에도 연결되지 않은 근거 요구사항(누락 후보)이 있습니다: ${missing.join(', ')}`, 'warn');
    else await apply(confirmed, done);
  });
  const revert = () => {
    loadEditor(record ? cloneDesign(record.DESIGN) : null, Boolean(record));
    setMessage({ type: 'info', text: record ? '저장된 설계로 되돌렸습니다.' : '작성 중인 설계를 취소했습니다.' });
  };
  const blank = () => { loadEditor(emptyDesign(), true); setMessage({ type: 'info', text: '빈 설계로 시작합니다. 항목을 추가한 뒤 저장하세요.' }); };
  const generate = () => void run(async () => {
    try {
      const draft = await screenDesignApi.aiDraft(projectId, selectedId);
      setWorking(true); setScreenType(draft.DESIGN.SCREEN_TYPE); setActions(draft.DESIGN.ACTION_CODES);
      replaceSearch([]); replaceColumns([]); replaceDetail([]); replaceFunctions([]); setSelectedRows(new Set());
      draft.DESIGN.SEARCH_FIELDS.forEach(addSearch); draft.DESIGN.GRID_COLUMNS.forEach(addColumn); draft.DESIGN.DETAIL_FIELDS.forEach(addDetail); draft.DESIGN.FUNCTION_SPECS.forEach(addFunction);
      setTab('search');
      const base = 'AI 초안을 생성했습니다. 검토·수정한 뒤 저장하세요. (AI 제안 항목은 구분 열에 표시됩니다)';
      setMessage(draft.WARNINGS.length ? { type: 'warn', text: `${base} 자동 정리한 내용: ${draft.WARNINGS.join(' / ')}` } : { type: 'info', text: base });
    } finally { setAiOpen(false); }
  });

  const exportDocument = () => {
    if (!record || !program) return;
    const fileName = docFileName(program.PROGRAM_ID, record.VERSION);
    const html = renderDesignDocument({
      generatedAt: new Date().toLocaleDateString('sv-SE'), projectId, projectName: getProjects().find(item => item.PROJECT_ID === projectId)?.PROJECT_NAME ?? projectId,
      program: { PROGRAM_ID: program.PROGRAM_ID, PROGRAM_NAME: program.PROGRAM_NAME, PROGRAM_KIND_LABEL: programKindLabel(program.PROGRAM_KIND), SOURCE_GROUP_ID: program.SOURCE_GROUP_ID ?? '', SOURCE_GROUP_NAME: program.SOURCE_GROUP_ID ? groupNames.get(program.SOURCE_GROUP_ID) ?? '' : '', DESCRIPTION: program.DESCRIPTION },
      design: { VERSION: record.VERSION, DESIGN_STATUS: record.DESIGN_STATUS }, evidence: evidenceFromProgram(program.EVIDENCE), body: record.DESIGN,
    });
    downloadTextFile(fileName, html, 'text/html;charset=utf-8');
    setMessage({ type: 'info', text: `설계서를 내려받았습니다. (${fileName})${record.DESIGN_STATUS === 'DRAFT' ? ' 초안 상태라 표지에 "초안 · 현업 검토 전"이 표시됩니다.' : ''}` });
  };
  const openFunction = (row: TrackedGridRow<FunctionSpec>) => setEditing({
    id: row.__GRID_ROW_ID, name: row.NAME, action: row.ACTION_CODE, description: row.DESCRIPTION,
    rules: linesToText(row.RULES), validations: linesToText(row.VALIDATIONS), acceptance: linesToText(row.ACCEPTANCE), requirements: row.REQUIREMENT_IDS,
  });
  const saveFunction = () => {
    if (!editing) return;
    functionRows.update(editing.id, row => ({ ...row, NAME: editing.name.trim(), ACTION_CODE: editing.action, DESCRIPTION: editing.description, RULES: textToLines(editing.rules), VALIDATIONS: textToLines(editing.validations), ACCEPTANCE: textToLines(editing.acceptance), REQUIREMENT_IDS: evidenceIds.filter(id => editing.requirements.includes(id)) }));
    setEditing(null);
  };

  const fieldColumns = (state: typeof searchRows, kind: 'search' | 'detail'): DataTableColumn<TrackedGridRow<FieldRow>>[] => {
    const set = (row: TrackedGridRow<FieldRow>, patch: Partial<FieldRow>) => state.update(row.__GRID_ROW_ID, value => ({ ...value, ...patch }));
    return [
      { key: 'LABEL', header: '항목명', minWidth: 160, flex: 1.4, render: row => <input className="basekit-grid-input" aria-label="항목명" maxLength={100} value={row.LABEL} onChange={event => set(row, { LABEL: event.target.value })} onClick={event => event.stopPropagation()} /> },
      { key: 'CONTROL_TYPE', header: '컨트롤', width: 140, render: row => <select className="basekit-grid-input" aria-label="컨트롤" value={row.CONTROL_TYPE} onChange={event => set(row, { CONTROL_TYPE: event.target.value as ControlType })} onClick={event => event.stopPropagation()}>{CONTROL_TYPES.map(type => <option key={type} value={type}>{CONTROL_LABELS[type]}</option>)}</select> },
      { key: 'REQUIRED_YN', header: '필수', width: 70, align: 'center', render: row => <input type="checkbox" aria-label="필수" checked={row.REQUIRED_YN === 'Y'} onChange={event => set(row, { REQUIRED_YN: event.target.checked ? 'Y' : 'N' })} onClick={event => event.stopPropagation()} /> },
      kind === 'search'
        ? { key: 'RULE', header: '검색 규칙', minWidth: 140, flex: 1.2, render: row => <input className="basekit-grid-input" aria-label="검색 규칙" maxLength={200} value={row.RULE ?? ''} onChange={event => set(row, { RULE: event.target.value })} onClick={event => event.stopPropagation()} /> }
        : { key: 'READONLY_YN', header: '읽기전용', width: 84, align: 'center', render: row => <input type="checkbox" aria-label="읽기전용" checked={row.READONLY_YN === 'Y'} onChange={event => set(row, { READONLY_YN: event.target.checked ? 'Y' : 'N' })} onClick={event => event.stopPropagation()} /> },
      { key: 'SOURCE', header: '구분', width: 90, align: 'center', render: row => sourceBadge(row.SOURCE) },
    ];
  };
  const functionColumns = (): DataTableColumn<TrackedGridRow<FunctionSpec>>[] => {
    const set = (row: TrackedGridRow<FunctionSpec>, patch: Partial<FunctionSpec>) => functionRows.update(row.__GRID_ROW_ID, value => ({ ...value, ...patch }));
    return [
      { key: 'FUNCTION_ID', header: '기능ID', width: 78, render: row => row.FUNCTION_ID },
      { key: 'NAME', header: '기능명', minWidth: 140, flex: 1.2, render: row => <input className="basekit-grid-input" aria-label="기능명" maxLength={100} value={row.NAME} onChange={event => set(row, { NAME: event.target.value })} onClick={event => event.stopPropagation()} /> },
      { key: 'ACTION_CODE', header: 'ACTION_CODE', width: 150, render: row => <select className="basekit-grid-input" aria-label="ACTION_CODE" value={row.ACTION_CODE} onChange={event => set(row, { ACTION_CODE: event.target.value })} onClick={event => event.stopPropagation()}><option value="">(없음)</option>{[...new Set([...actions, ...(row.ACTION_CODE ? [row.ACTION_CODE] : [])])].map(code => <option key={code} value={code}>{code}</option>)}</select> },
      { key: 'DESCRIPTION', header: '설명', minWidth: 160, flex: 1.5, render: row => row.DESCRIPTION || '-' },
      { key: 'RULES', header: '규칙', width: 56, align: 'right', render: row => row.RULES.length },
      { key: 'REQUIREMENT_IDS', header: '근거 요구사항', minWidth: 130, flex: 1, render: row => row.REQUIREMENT_IDS.length ? row.REQUIREMENT_IDS.join(', ') : '-' },
      { key: 'SOURCE', header: '구분', width: 90, align: 'center', render: row => sourceBadge(row.SOURCE) },
      { key: 'EDIT', header: '상세', width: 100, align: 'center', render: row => <ActionButton actionCode={COMMON_ACTIONS.UPDATE} label="상세 편집" display="text" onClick={() => openFunction(row)} /> },
    ];
  };
  const columnColumns = (): DataTableColumn<TrackedGridRow<ColumnRow>>[] => {
    const set = (row: TrackedGridRow<ColumnRow>, patch: Partial<ColumnRow>) => columnRows.update(row.__GRID_ROW_ID, value => ({ ...value, ...patch }));
    return [
      { key: 'LABEL', header: '컬럼명', minWidth: 160, flex: 1.4, render: row => <input className="basekit-grid-input" aria-label="컬럼명" maxLength={100} value={row.LABEL} onChange={event => set(row, { LABEL: event.target.value })} onClick={event => event.stopPropagation()} /> },
      { key: 'WIDTH', header: '너비(px)', width: 100, render: row => <input className="basekit-grid-input" aria-label="너비" type="number" min={40} max={800} value={row.WIDTH} onChange={event => set(row, { WIDTH: Number(event.target.value) })} onClick={event => event.stopPropagation()} /> },
      { key: 'DATA_TYPE', header: '유형', width: 120, render: row => <select className="basekit-grid-input" aria-label="유형" value={row.DATA_TYPE} onChange={event => { const dataType = event.target.value as DataType; set(row, { DATA_TYPE: dataType, ALIGN: defaultAlign(dataType) }); }} onClick={event => event.stopPropagation()}>{DATA_TYPES.map(type => <option key={type} value={type}>{DATA_TYPE_LABELS[type]}</option>)}</select> },
      { key: 'ALIGN', header: '정렬', width: 100, render: row => <select className="basekit-grid-input" aria-label="정렬" value={row.ALIGN} onChange={event => set(row, { ALIGN: event.target.value as Align })} onClick={event => event.stopPropagation()}>{ALIGNS.map(type => <option key={type} value={type}>{ALIGN_LABELS[type]}</option>)}</select> },
      { key: 'SOURCE', header: '구분', width: 90, align: 'center', render: row => sourceBadge(row.SOURCE) },
    ];
  };
  const count = (rows: { length: number }) => rows.length;
  const editableGrid = <T extends { __GRID_ROW_ID: string }>(title: string, state: { rows: T[]; getState: (row: T) => never; add: (row: never) => void; remove: (ids: Iterable<string>) => void }, columns: DataTableColumn<T>[], make: () => unknown) => (
    <BaseKitDataGrid<T> programKey={programKey} roleCode={roleCode} title={title} columns={columns} rows={state.rows} getRowKey={rowId}
      getRowState={state.getState as never} selectedRowKeys={selectedRows} onSelectedRowKeysChange={setSelectedRows}
      emptyMessage="등록된 항목이 없습니다. 행추가로 항목을 추가하세요." batchActions={{ onAddRow: () => state.add(make() as never), rowState: { remove: ids => { state.remove(ids); setSelectedRows(new Set()); } } }} />
  );
  const actionRows = ACTION_DEFS.map(item => ({ ...item, __GRID_ROW_ID: item.code }));
  const toggleAction = (code: string, on: boolean) => setActions(list => on ? [...new Set([...list, code])] : list.filter(item => item !== code));

  const tabs = [
    { id: 'search', label: `검색조건 (${count(searchRows.rows.filter(row => searchRows.getState(row) !== 'DELETED'))})`, content: editableGrid('검색조건', searchRows as never, fieldColumns(searchRows, 'search') as never, newSearchField) },
    { id: 'cols', label: `그리드 컬럼 (${count(columnRows.rows.filter(row => columnRows.getState(row) !== 'DELETED'))})`, content: editableGrid('그리드 컬럼', columnRows as never, columnColumns() as never, newColumn) },
    { id: 'detail', label: `상세 입력항목 (${count(detailRows.rows.filter(row => detailRows.getState(row) !== 'DELETED'))})`, content: editableGrid('상세 입력항목', detailRows as never, fieldColumns(detailRows, 'detail') as never, newDetailField) },
    { id: 'functions', label: `기능 요건 (${count(functionRows.rows.filter(row => functionRows.getState(row) !== 'DELETED'))})`, content: editableGrid('기능 요건', functionRows as never, functionColumns() as never, () => newFunctionSpec(functionRows.rows)) },
    { id: 'actions', label: `버튼 · Action (${actions.length})`, content: (
      <BaseKitDataGrid programKey={programKey} roleCode={roleCode} title="버튼 · Action" selectable={false} toolbarActions={[]} rows={actionRows} getRowKey={rowId}
        columns={[
          { key: 'USE', header: '사용', width: 70, align: 'center', render: row => <input type="checkbox" aria-label={`${row.label} 사용`} checked={actions.includes(row.code)} onChange={event => toggleAction(row.code, event.target.checked)} /> },
          { key: 'code', header: 'ACTION_CODE', minWidth: 160, flex: 1, render: row => row.code },
          { key: 'label', header: '버튼명', minWidth: 140, flex: 1, render: row => row.label },
          { key: 'note', header: '비고', minWidth: 220, flex: 2, render: () => 'ROLE × PROGRAM × ACTION_CODE 권한 단위' },
        ]} />
    ) },
  ];

  const masterColumns: DataTableColumn<ProgramRow>[] = [
    { key: 'no', header: 'No', width: 48, align: 'center', render: row => visibleRows.indexOf(row) + 1 },
    { key: 'PROGRAM_NAME', header: '프로그램명', minWidth: 100, flex: 1.4, render: row => row.PROGRAM_NAME },
    { key: 'GROUP_NAME', header: '출처 그룹', minWidth: 80, flex: 1, render: row => row.MANUAL ? badge('수동 추가') : row.GROUP_NAME },
    { key: 'KIND', header: '종류', width: 64, render: row => programKindLabel(row.KIND) },
    { key: 'EVIDENCE_COUNT', header: '근거', width: 52, align: 'right', render: row => row.EVIDENCE_COUNT },
    { key: 'STATUS', header: '설계상태', width: 80, align: 'center', render: row => statusBadge(row.STATUS) },
  ];
  const doneCount = programRows.filter(row => row.STATUS === 'CONFIRMED').length;

  const detailTop: ReactNode = program && (
    <section className="program-data-grid sd-screen-detail-top" aria-label="화면 설계">
      <div className="grid-toolbar">
        <div className="grid-heading-group">
          <h2 title={program.PROGRAM_NAME}>화면 설계 · {program.PROGRAM_NAME}</h2>
          {statusBadge(status)}
          <span className="grid-total">설계 v<strong>{record?.VERSION ?? '-'}</strong></span>
        </div>
        <div className="grid-actions" aria-label="화면 설계 기능">
          {allowed(AI_DRAFT_ACTION) && <ActionButton actionCode={AI_DRAFT_ACTION} label="AI 초안" disabled={!buttons.aiDraft} onClick={() => setAiOpen(true)} />}
          {allowed(COMMON_ACTIONS.REVERT_CHANGES) && <ActionButton actionCode={COMMON_ACTIONS.REVERT_CHANGES} label="되돌리기" disabled={!buttons.revert} onClick={revert} />}
          {allowed(COMMON_ACTIONS.SAVE) && <ActionButton actionCode={COMMON_ACTIONS.SAVE} label="저장" disabled={!buttons.save} onClick={save} />}
          {allowed(COMMON_ACTIONS.APPROVE) && <ActionButton actionCode={COMMON_ACTIONS.APPROVE} label="설계 확정" disabled={!buttons.confirm} onClick={confirm} />}
          {allowed(EXPORT_ACTION) && <ActionButton actionCode={EXPORT_ACTION} label="설계서 출력" disabled={!canExport} onClick={exportDocument} />}
        </div>
      </div>
      <div className="sd-screen-form">
        <div className="sd-screen-form-row"><span>프로그램ID</span><span>{program.PROGRAM_ID}</span></div>
        <div className="sd-screen-form-row"><span>출처 그룹</span><span>{program.SOURCE_GROUP_ID ? `${groupNames.get(program.SOURCE_GROUP_ID) ?? ''} · ${program.SOURCE_GROUP_ID}` : '수동 추가'}</span></div>
        <div className="sd-screen-form-row sd-screen-span"><span>설명</span><span>{program.DESCRIPTION || '-'}</span></div>
        <label className="sd-screen-form-row"><span>화면 유형</span>
          <select aria-label="화면 유형" disabled={!working || busy} value={screenType} onChange={event => setScreenType(event.target.value as ScreenType)}>
            {SCREEN_TYPES.map(type => <option key={type} value={type}>{type} · {SCREEN_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <div className="sd-screen-form-row"><span>근거 요구사항</span><span className="sd-screen-evidence">{program.EVIDENCE.length ? program.EVIDENCE.map(item => <span key={item.REQUIREMENT_ID}><b>{item.REQUIREMENT_ID}</b></span>) : <span>근거 없음(수동 추가)</span>}</span></div>
      </div>
    </section>
  );

  const detailBottomBody: ReactNode = detailLoading ? <div className="sd-screen-empty" role="status">설계를 불러오는 중…</div>
    : !working ? (
      <div className="sd-screen-empty"><strong>아직 설계된 화면이 없습니다</strong><span>상단 <b>AI 초안</b>으로 시작하거나 빈 설계로 직접 작성하세요.</span>
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label="빈 설계로 시작" display="text" disabled={busy} onClick={blank} /></div>
    ) : <BaseTabs tabs={tabs} activeTab={tab} onChange={id => { setTab(id as TabId); setSelectedRows(new Set()); }} ariaLabel="화면 설계 탭" />;
  const detailBottom: ReactNode = <div className="sd-screen-detail-bottom">{detailBottomBody}</div>;

  return <>
    <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initialSearch} onValueChange={setCondition} onSearch={value => { setApplied(value); reload(); }} onReset={value => { setCondition(value); setApplied(value); }} />
    <MasterDetailMultiGrid detailTopSizing="content"
      master={<BaseKitDataGrid programKey={programKey} roleCode={roleCode} title="프로그램 목록" selectable={false} columns={masterColumns} rows={visibleRows} getRowKey={row => row.PROGRAM_ID} currentRowKey={selectedId} loading={loading}
        metrics={[{ label: '설계 확정', value: doneCount }]} onRowClick={row => pick(row.PROGRAM_ID)} emptyMessage="등록된 프로그램이 없습니다. 프로그램 대장에서 등록하세요."
        toolbarActions={onOpenRegister && allowed(COMMON_ACTIONS.CREATE) ? [{ actionCode: COMMON_ACTIONS.CREATE, label: '프로그램 등록', onClick: onOpenRegister }] : []} />}
      detailEmpty={program ? undefined : <div className="sd-screen-empty"><strong>왼쪽 목록에서 프로그램을 선택하세요</strong><span>선택한 프로그램의 화면(UI)을 여기에서 설계합니다.</span></div>}
      detailTop={detailTop} detailBottom={detailBottom}
      message={message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null} />
    <FormModal open={aiOpen} title="AI 화면 설계 초안 생성" submitLabel="초안 생성" submitting={busy} onClose={() => { if (!busy) setAiOpen(false); }} onSubmit={generate}>
      {program && <div className="sd-screen-ai">
        <p>아래 정보를 BaseKit Backend를 거쳐 회사 LLM에 전달해 화면 설계 초안을 만듭니다. (Browser는 LLM을 직접 호출하지 않습니다.)</p>
        <dl><dt>프로그램</dt><dd><b>{program.PROGRAM_NAME}</b></dd><dt>설명</dt><dd>{program.DESCRIPTION || '-'}</dd>
          <dt>근거</dt><dd>{program.EVIDENCE.length ? `근거 요구사항 ${program.EVIDENCE.length}건` : '근거 요구사항 없음 — 프로그램 설명만으로 생성됩니다.'}</dd></dl>
        {working && <p className="sd-screen-ai-warn">현재 편집 중인 내용은 AI 초안으로 대체됩니다. 저장 전에는 되돌리기로 복구할 수 있습니다.</p>}
      </div>}
    </FormModal>
    <FormModal open={Boolean(editing)} title={`기능 요건 상세 편집${editing ? ` · ${editing.id.startsWith('NEW_') ? '새 기능' : editing.id}` : ''}`} submitLabel="적용" submitDisabled={!editing?.name.trim()} onClose={() => setEditing(null)} onSubmit={saveFunction}>
      {editing && program && <div className="sd-screen-func">
        <label><span>기능명 *</span><input aria-label="기능명" maxLength={100} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
        <label><span>ACTION_CODE</span><select aria-label="ACTION_CODE" value={editing.action} onChange={event => setEditing({ ...editing, action: event.target.value })}><option value="">(없음)</option>{[...new Set([...actions, ...(editing.action ? [editing.action] : [])])].map(code => <option key={code} value={code}>{code}</option>)}</select></label>
        <label><span>설명</span><textarea aria-label="설명" rows={3} maxLength={2000} value={editing.description} onChange={event => setEditing({ ...editing, description: event.target.value })} /></label>
        <label><span>처리 규칙 (한 줄에 하나)</span><textarea aria-label="처리 규칙" rows={4} value={editing.rules} onChange={event => setEditing({ ...editing, rules: event.target.value })} /></label>
        <label><span>검증 · 오류 메시지 (한 줄에 하나)</span><textarea aria-label="검증 오류 메시지" rows={3} value={editing.validations} onChange={event => setEditing({ ...editing, validations: event.target.value })} /></label>
        <label><span>수용 기준 (Given/When/Then, 한 줄에 하나)</span><textarea aria-label="수용 기준" rows={3} value={editing.acceptance} onChange={event => setEditing({ ...editing, acceptance: event.target.value })} /></label>
        <fieldset><legend>근거 요구사항</legend>
          {evidenceFromProgram(program.EVIDENCE).length ? evidenceFromProgram(program.EVIDENCE).map(item => <label key={item.REQUIREMENT_ID} className="sd-screen-func-check"><input type="checkbox" checked={editing.requirements.includes(item.REQUIREMENT_ID)} onChange={event => setEditing({ ...editing, requirements: event.target.checked ? [...editing.requirements, item.REQUIREMENT_ID] : editing.requirements.filter(id => id !== item.REQUIREMENT_ID) })} /><span><b>{item.REQUIREMENT_ID}</b> {item.NAME}</span></label>) : <p>근거 요구사항이 없는 프로그램입니다.</p>}
        </fieldset>
      </div>}
    </FormModal>
  </>;
}
