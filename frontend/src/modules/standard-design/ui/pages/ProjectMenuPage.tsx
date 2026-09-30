import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionButton, BaseKitMessage, PageHeader, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../../../../components/common';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import { COMMON_ACTIONS } from '../../../../constants/actionCodes';
import { useGridRowState, type TrackedGridRow } from '../../../../components/grid/gridRowState';
import ProjectContextSelector from '../components/ProjectContextSelector';
import { useProjectContext } from '../components/useProjectContext';
import { projectMenuApi, type ProjectMenu, type ProjectMenuInput, type ProjectMenuMode } from '../../projectmenu/projectMenuApi';

interface SearchCondition { keyword: string }
const initialSearch: SearchCondition = { keyword: '' };
const menuKey = (row: ProjectMenu) => row.PROJECT_MENU_ID;
const toInput = (row: ProjectMenu, mode: ProjectMenuMode): ProjectMenuInput => ({ PROJECT_ID: row.PROJECT_ID, MENU_ID: row.MENU_ID.trim(), MENU_NAME: row.MENU_NAME.trim(), MENU_LEVEL: mode === 'LEVEL' ? row.MENU_LEVEL : null, LEVEL1_MENU_ID: mode === 'LEVEL' ? row.LEVEL1_MENU_ID : null, SORT_ORDER: row.SORT_ORDER });

export default function ProjectMenuPage() {
  const { projectId } = useProjectContext();
  const [mode, setMode] = useState<ProjectMenuMode>('LEVEL');
  const [rows, setRows] = useState<ProjectMenu[]>([]);
  const [condition, setCondition] = useState(initialSearch);
  const [applied, setApplied] = useState(initialSearch);
  const [selected, setSelected] = useState(new Set<string>());
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const rowState = useGridRowState<ProjectMenu>(menuKey);
  const replaceRows = rowState.replace;
  const updateRow = rowState.update;
  const load = async () => {
    if (!projectId) { setRows([]); replaceRows([]); return; }
    const page = await projectMenuApi.list(projectId);
    setMode(page.MENU_MANAGEMENT_MODE); setRows(page.ITEMS); replaceRows(page.ITEMS); setSelected(new Set());
  };
  useEffect(() => {
    let current = true;
    if (projectId) projectMenuApi.list(projectId).then((page) => { if (current) { setMode(page.MENU_MANAGEMENT_MODE); setRows(page.ITEMS); replaceRows(page.ITEMS); setSelected(new Set()); } }).catch((error: Error) => { if (current) setMessage({ type: 'error', text: error.message }); });
    return () => { current = false; };
  }, [projectId, replaceRows]);
  const visibleRows = useMemo(() => {
    const keyword = applied.keyword.trim().toLocaleLowerCase();
    return rowState.rows.filter((row) => !keyword || `${row.MENU_ID} ${row.MENU_NAME}`.toLocaleLowerCase().includes(keyword));
  }, [applied.keyword, rowState.rows]);
  const level1Options = rowState.rows.filter((row) => row.MENU_LEVEL === 1 && rowState.getState(row) !== 'DELETED');
  const update = useCallback((row: TrackedGridRow<ProjectMenu>, field: keyof ProjectMenu, value: string | number | null) => updateRow(row.__GRID_ROW_ID, (current) => ({ ...current, [field]: value })), [updateRow]);
  const columns = useMemo<DataTableColumn<TrackedGridRow<ProjectMenu>>[]>(() => [
    { key: 'MENU_ID', header: '메뉴 ID', minWidth: 160, flex: 1, render: (row) => <input className="basekit-grid-input sd-project-menu-input" maxLength={100} value={row.MENU_ID} onChange={(event) => update(row, 'MENU_ID', event.target.value)} onClick={(event) => event.stopPropagation()} /> },
    { key: 'MENU_NAME', header: '메뉴명', minWidth: 180, flex: 1.2, render: (row) => <input className="basekit-grid-input sd-project-menu-input" maxLength={200} value={row.MENU_NAME} onChange={(event) => update(row, 'MENU_NAME', event.target.value)} onClick={(event) => event.stopPropagation()} /> },
    ...(mode === 'LEVEL' ? [
      { key: 'MENU_LEVEL', header: '레벨', width: 80, render: (row: TrackedGridRow<ProjectMenu>) => <input className="basekit-grid-input sd-project-menu-input sd-project-menu-input--number" type="number" min={1} max={99} value={row.MENU_LEVEL ?? 1} onChange={(event) => { const value = Number(event.target.value) || 1; update(row, 'MENU_LEVEL', value); if (value <= 1) update(row, 'LEVEL1_MENU_ID', null); }} onClick={(event) => event.stopPropagation()} /> },
      { key: 'LEVEL1_MENU_ID', header: '1레벨 메뉴', minWidth: 150, flex: 1, render: (row: TrackedGridRow<ProjectMenu>) => row.MENU_LEVEL && row.MENU_LEVEL > 1 ? <select className="basekit-grid-input sd-project-menu-input" value={row.LEVEL1_MENU_ID ?? ''} onChange={(event) => update(row, 'LEVEL1_MENU_ID', event.target.value || null)} onClick={(event) => event.stopPropagation()}><option value="">선택</option>{level1Options.filter((option) => option.MENU_ID !== row.MENU_ID).map((option) => <option key={option.PROJECT_MENU_ID} value={option.MENU_ID}>{option.MENU_NAME} ({option.MENU_ID})</option>)}</select> : <span className="sd-project-menu-level-root">-</span> },
    ] : []),
  ], [level1Options, mode, update]);
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : '작업을 완료하지 못했습니다.' }); } finally { setBusy(false); } };
  const save = () => void run(async () => {
    const changed = [...rowState.changeSet.INSERTED, ...rowState.changeSet.UPDATED];
    for (const row of changed) {
      const input = toInput(row, mode);
      if (!input.MENU_ID || !input.MENU_NAME) throw new Error('메뉴 ID와 메뉴명을 입력하세요.');
      if (rowState.changeSet.INSERTED.some((item) => item !== row && item.MENU_ID === row.MENU_ID) || rowState.rows.filter((item) => item.PROJECT_MENU_ID !== row.PROJECT_MENU_ID && item.MENU_ID === row.MENU_ID && rowState.getState(item) !== 'DELETED').length > 0) throw new Error(`중복 메뉴 ID: ${row.MENU_ID}`);
      if (row.PROJECT_MENU_ID.startsWith('NEW_')) await projectMenuApi.create(input);
      else await projectMenuApi.update(row.PROJECT_MENU_ID, input);
    }
    for (const id of rowState.changeSet.DELETED) await projectMenuApi.delete(id);
    await load(); setMessage({ type: 'success', text: '프로젝트 메뉴를 저장했습니다.' });
  });
  const changeMode = (next: ProjectMenuMode) => {
    if (next === mode) return;
    if (rowState.dirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 관리 방식을 변경하시겠습니까?')) return;
    void run(async () => { const page = await projectMenuApi.setMode(projectId, next); setMode(page.MENU_MANAGEMENT_MODE); setRows(page.ITEMS); rowState.replace(page.ITEMS); setMessage({ type: 'info', text: `${next === 'LEVEL' ? '레벨' : '단일'} 관리 방식으로 변경했습니다.` }); });
  };
  const add = () => { if (!projectId) return; rowState.add({ PROJECT_MENU_ID: `NEW_${Date.now()}`, PROJECT_ID: projectId, MENU_ID: '', MENU_NAME: '', MENU_LEVEL: mode === 'LEVEL' ? 1 : null, LEVEL1_MENU_ID: null, SORT_ORDER: rowState.rows.length + 1 }); };
  const searchFields: SearchFieldConfig<SearchCondition>[] = [{ key: 'keyword', label: '메뉴 ID/명', placeholder: '메뉴 ID 또는 메뉴명' }];
  const actions = <div className="standard-design-header-actions"><ProjectContextSelector /><ActionButton display="text" actionCode={COMMON_ACTIONS.EXCEL_UPLOAD} label="Excel 가져오기" onClick={() => setMessage({ type: 'info', text: 'Excel 가져오기는 진입점만 제공하며 Parser는 후속 범위입니다.' })} /></div>;
  return <div className="page standard-design-page sd-project-menu-page">
    <PageHeader breadcrumbs={['Standard Design', 'Project Menu']} rightContent={actions} />
    {!projectId ? <p className="sd-project-empty-help">프로젝트 Context를 선택하세요.</p> : <>
      <div className="sd-project-menu-controls"><div><strong>메뉴 관리 방식</strong><label><input type="radio" checked={mode === 'LEVEL'} onChange={() => changeMode('LEVEL')} /> 레벨</label><label><input type="radio" checked={mode === 'SINGLE'} onChange={() => changeMode('SINGLE')} /> 단일</label><span className="sd-project-menu-help">{mode === 'LEVEL' ? '1레벨 메뉴와 레벨을 기준으로 분류합니다.' : '메뉴 ID와 메뉴명만 관리합니다.'}</span></div></div>
      <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initialSearch} onValueChange={setCondition} onSearch={setApplied} onReset={(value) => { setCondition(value); setApplied(value); }} />
      <BaseKitDataGrid programKey="SD_PROJECT_MENU" roleCode="ADMIN" title="프로젝트 메뉴 목록" columns={columns} rows={visibleRows} getRowKey={(row) => row.__GRID_ROW_ID} getRowState={rowState.getState} selectedRowKeys={selected} onSelectedRowKeysChange={setSelected} emptyMessage="등록된 프로젝트 메뉴가 없습니다." loading={busy} toolbarActions={[
        { actionCode: COMMON_ACTIONS.CREATE, label: '행추가', onClick: add },
        { actionCode: COMMON_ACTIONS.DELETE, label: '행삭제', tone: 'danger', disabled: selected.size === 0, onClick: () => { rowState.remove(selected); setSelected(new Set()); } },
        { actionCode: COMMON_ACTIONS.UPDATE, label: '저장', tone: 'primary', disabled: busy || !rowState.dirty, onClick: save },
        { actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '취소', disabled: busy || !rowState.dirty, onClick: () => rowState.replace(rows) },
      ]} />
      <div className="sd-project-menu-message-area">{message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} /> : null}</div>
    </>}
  </div>;
}
