import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionButton from '../components/common/ActionButton';
import BaseKitDataGrid from '../components/grid/BaseKitDataGrid';
import FormModal from '../components/common/FormModal';
import PageHeader from '../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../components/common/SearchPanel';
import type { DataTableColumn } from '../components/common/DataTable';
import { TreeDataGrid, type TreeDataGridChange, type TreeDataGridColumn, type TreeDataGridPendingRow } from '../components/treeDataGrid';
import type { GridRowState } from '../components/grid/gridRowState';
import type { TreeDataGridIssue, TreeDataGridSaveResult } from '../components/treeDataGrid';
import { menuApi, type MenuRecord, type MenuSave } from '../services/menuApi';
import { MENU_RUNTIME_CHANGED_EVENT } from '../services/menuRuntimeApi';
import { listMenuExecutionSettings, saveMenuExecutionSetting, type MenuExecutionSetting } from '../services/menuExecutionApi';
import { programApi } from '../services/programApi';
import type { Program } from '../types/program';
import './menuManage.css';

type ProgramSearch = { KEYWORD: string };
type ProgramTarget = { rowId: string; onChange: (value: unknown) => void };
const emptyProgramSearch: ProgramSearch = { KEYWORD: '' };
const menuFields = { idField: 'MENU_KEY', parentIdField: 'PARENT_MENU_KEY', nodeTypeField: 'MENU_TYPE_CODE', nodeTypes: ['FOLDER', 'PAGE'], nameField: 'MENU_NAME', sortField: 'SORT_ORDER' } as const;

function childCount(rows: MenuRecord[], key: string) {
  return rows.filter((row) => row.PARENT_MENU_KEY === key).length;
}

function issue(row: MenuRecord, field: string, message: string): TreeDataGridIssue {
  return { code: 'REQUIRED', rowId: row.MENU_KEY || field, field, message };
}

export default function MenuManagePage() {
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [settings, setSettings] = useState<MenuExecutionSetting[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [change, setChange] = useState<TreeDataGridChange<MenuRecord> | null>(null);
  const [programSearch, setProgramSearch] = useState<ProgramSearch>(emptyProgramSearch);
  const [appliedProgramSearch, setAppliedProgramSearch] = useState<ProgramSearch>(emptyProgramSearch);
  const [programTarget, setProgramTarget] = useState<ProgramTarget | null>(null);
  const [selectedProgramKey, setSelectedProgramKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const rowsRef = useRef<MenuRecord[]>(menus);
  const programByKey = useMemo(() => new Map(programs.map((program) => [program.PROGRAM_KEY, program])), [programs]);
  const gridMenus = useMemo(() => menus.map((row) => {
    if (row.PARENT_MENU_KEY) return { ...row, EXECUTION_TYPE: '', DESIGN_TYPE: '' };
    const setting = settings.find((item) => item.MENU_ID === row.MENU_KEY);
    return { ...row, EXECUTION_TYPE: setting?.EXECUTION_TYPE ?? 'INNER', DESIGN_TYPE: setting?.DESIGN_TYPE ?? 'BASEKIT' };
  }), [menus, settings]);

  useEffect(() => { rowsRef.current = menus; }, [menus]);

  const reload = useCallback(async () => {
    const [rows, programRows, settingRows] = await Promise.all([
      menuApi.find({}), programApi.find({}), listMenuExecutionSettings(),
    ]);
    setMenus(rows);
    setPrograms(programRows);
    setSettings(settingRows);
    setLoaded(true);
    return rows;
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void reload().then((rows) => {
        if (!active) return;
        setChange(null);
        if (rows.length) selectRow(rows[0], rows);
      }).catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : '메뉴 조회에 실패했습니다.');
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
    // Initial loading is intentionally performed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRow(row: MenuRecord | null, sourceRows = rowsRef.current) {
    setSelectedKey(row?.MENU_KEY || null);
    if (row?.MENU_KEY) rowsRef.current = sourceRows;
  }

  const onGridChange = useCallback((next: TreeDataGridChange<MenuRecord>) => {
    rowsRef.current = next.rows;
    setChange(next);
  }, []);

  const columns = useMemo<TreeDataGridColumn<MenuRecord>[]>(() => [
    {
      field: 'PARENT_MENU_KEY', headerName: '상위 메뉴', width: 185, editor: 'select',
      getOptions: (row) => {
        const descendants = new Set<string>();
        const visit = (key: string) => rowsRef.current.filter((item) => item.PARENT_MENU_KEY === key).forEach((item) => { descendants.add(item.MENU_KEY); visit(item.MENU_KEY); });
        if (row.MENU_KEY) visit(row.MENU_KEY);
        return [
          { value: '', label: '최상위 메뉴' },
          ...rowsRef.current.filter((item) => item.MENU_TYPE_CODE === 'FOLDER' && item.MENU_KEY !== row.MENU_KEY && !descendants.has(item.MENU_KEY)
            && (item.USE_YN === 'Y' || item.MENU_KEY === row.PARENT_MENU_KEY))
            .map((item) => ({ value: item.MENU_KEY, label: `${item.MENU_NAME} (${item.MENU_KEY})` })),
        ];
      },
      onChange: (_row, value) => ({ PARENT_MENU_KEY: value ? String(value) : null }),
    },
    {
      field: 'MENU_KEY', headerName: 'MENU KEY', width: 165, editor: 'text',
      editable: (_row, state) => state === 'INSERTED', inputProps: { maxLength: 100, autoComplete: 'off' },
    },
    {
      field: 'MENU_TYPE_CODE', headerName: '메뉴 유형', width: 125, editor: 'select',
      options: [{ value: 'FOLDER', label: 'FOLDER' }, { value: 'PAGE', label: 'PAGE' }],
      editable: (row, state) => state !== 'DELETED' && !rowsRef.current.some((item) => item.PARENT_MENU_KEY === row.MENU_KEY),
      onChange: (_row, value) => ({ MENU_TYPE_CODE: String(value), ...(value === 'FOLDER' ? { PROGRAM_KEY: null } : {}) }),
    },
    { field: 'SORT_ORDER', headerName: '정렬 순서', width: 105, editor: 'number', inputProps: { min: 0, step: 1 } },
    { field: 'USE_YN', headerName: '사용 여부', width: 95, editor: 'toggle', toggleValues: { on: 'Y', off: 'N', label: '사용 여부' } },
    {
      field: 'PROGRAM_KEY', headerName: '연결 프로그램', width: 245, editor: 'custom',
      editable: (row, state) => state !== 'DELETED' && row.MENU_TYPE_CODE === 'PAGE',
      renderEditor: ({ row, rowId, value, editable, onChange, onFocus }) => {
        if (row.MENU_TYPE_CODE !== 'PAGE') return <span className="menu-program-unavailable">-</span>;
        const program = programByKey.get(String(value ?? ''));
        return <div className="menu-program-cell" onFocus={onFocus}>
          <span className="menu-program-label" title={program ? `${program.PROGRAM_KEY} · ${program.PROGRAM_NAME}` : String(value ?? '')}>
            {program ? `${program.PROGRAM_KEY} · ${program.PROGRAM_NAME}` : value ? `${String(value)} · 프로그램 조회 안 됨` : '프로그램을 선택하세요'}
          </span>
          <button type="button" className="menu-program-lookup" disabled={!editable} onClick={(event) => { event.stopPropagation(); setProgramTarget({ rowId, onChange }); setProgramSearch(emptyProgramSearch); setAppliedProgramSearch(emptyProgramSearch); setSelectedProgramKey(null); }} aria-label="프로그램 검색">검색</button>
        </div>;
      },
    },
    {
      field: 'EXECUTION_TYPE', headerName: '실행 유형', width: 150, editor: 'select',
      options: [{ value: 'INNER', label: '기본 화면 (INNER)' }, { value: 'WINDOW', label: '독립 창 (WINDOW)' }],
      editable: (row, state) => state !== 'DELETED' && !row.PARENT_MENU_KEY && settings.some((setting) => setting.MENU_ID === row.MENU_KEY),
      renderEditor: ({ row, value, editable, onChange, onFocus }) => row.PARENT_MENU_KEY
        ? <span className="menu-execution-inherited">1Depth 설정 상속</span>
        : !editable ? <span className="menu-execution-inherited" title="실행 설정 카탈로그에 등록된 최상위 메뉴만 편집할 수 있습니다.">설정 대상 아님</span>
        : <select className="basekit-grid-input tree-grid-editor" aria-label="실행 유형" value={String(value || 'INNER')} disabled={!editable} onFocus={onFocus} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => onChange(event.target.value)}><option value="INNER">기본 화면 (INNER)</option><option value="WINDOW">독립 창 (WINDOW)</option></select>,
    },
    {
      field: 'DESIGN_TYPE', headerName: '디자인 유형', width: 140, editor: 'select',
      options: [{ value: 'BASEKIT', label: 'BASEKIT' }, { value: 'LINEAR', label: 'LINEAR' }],
      editable: (row, state) => state !== 'DELETED' && !row.PARENT_MENU_KEY && settings.some((setting) => setting.MENU_ID === row.MENU_KEY),
      renderEditor: ({ row, value, editable, onChange, onFocus }) => row.PARENT_MENU_KEY
        ? <span className="menu-execution-inherited">1Depth 설정 상속</span>
        : !editable ? <span className="menu-execution-inherited" title="실행 설정 카탈로그에 등록된 최상위 메뉴만 편집할 수 있습니다.">설정 대상 아님</span>
        : <select className="basekit-grid-input tree-grid-editor" aria-label="디자인 유형" value={String(value || 'BASEKIT')} disabled={!editable} onFocus={onFocus} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => onChange(event.target.value)}><option value="BASEKIT">BASEKIT</option><option value="LINEAR">LINEAR</option></select>,
    },
  ], [programByKey, settings]);

  const programMatches = useMemo(() => {
    const keyword = appliedProgramSearch.KEYWORD.trim().toLocaleLowerCase();
    return programs.filter((program) => program.USE_YN === 'Y'
      && (!keyword || `${program.PROGRAM_KEY} ${program.PROGRAM_NAME}`.toLocaleLowerCase().includes(keyword)));
  }, [appliedProgramSearch.KEYWORD, programs]);
  const programColumns = useMemo<DataTableColumn<Program>[]>(() => [
    { key: 'PROGRAM_KEY', header: '프로그램 KEY', width: 190, render: (row) => row.PROGRAM_KEY },
    { key: 'PROGRAM_NAME', header: '프로그램명', minWidth: 180, flex: 1, render: (row) => row.PROGRAM_NAME },
    { key: 'MODULE_CODE', header: '모듈', width: 115, render: (row) => row.MODULE_CODE },
    { key: 'ROUTE', header: 'Route', minWidth: 220, flex: 1.3, render: (row) => row.ROUTE },
  ], []);
  const programSearchFields = useMemo<SearchFieldConfig<ProgramSearch>[]>(() => [
    { key: 'KEYWORD', label: '프로그램', placeholder: 'KEY 또는 프로그램명' },
  ], []);

  async function saveMenuRows(_rows: MenuRecord[], _changeSet: TreeDataGridChange<MenuRecord>['changeSet'], pending: TreeDataGridPendingRow<MenuRecord>[]): Promise<TreeDataGridSaveResult> {
    if (!pending.length || busy) return { acceptedRowIds: [] };
    const liveRows = change?.rows ?? menus;
    const depthOf = (row: MenuRecord) => {
      let depth = 1; let parent = row.PARENT_MENU_KEY; const visited = new Set<string>();
      while (parent && !visited.has(parent)) { visited.add(parent); depth++; parent = liveRows.find((item) => item.MENU_KEY === parent)?.PARENT_MENU_KEY ?? null; }
      return depth;
    };
    const operations = [...pending].sort((left, right) => {
      if (left.state === 'DELETED' && right.state !== 'DELETED') return 1;
      if (right.state === 'DELETED' && left.state !== 'DELETED') return -1;
      return left.state === 'DELETED' ? depthOf(right.row) - depthOf(left.row) : depthOf(left.row) - depthOf(right.row);
    });
    const acceptedRowIds: string[] = [];
    const failures: Array<{ operation: TreeDataGridPendingRow<MenuRecord>; message: string }> = [];
    setBusy(true); setMessage('');
    try {
      for (const operation of operations) {
        const row = operation.row;
        try {
          if (operation.state === 'DELETED') await menuApi.delete(row.MENU_KEY);
          else {
            const payload: MenuSave = {
              MENU_KEY: row.MENU_KEY.trim(), MENU_NAME: row.MENU_NAME.trim(), PARENT_MENU_KEY: row.PARENT_MENU_KEY || null,
              MENU_TYPE_CODE: row.MENU_TYPE_CODE, SORT_ORDER: Number(row.SORT_ORDER),
              PROGRAM_KEY: row.MENU_TYPE_CODE === 'PAGE' ? row.PROGRAM_KEY : null, USE_YN: row.USE_YN,
            };
            if (operation.state === 'INSERTED') await menuApi.create(payload);
            else await menuApi.update(row.MENU_KEY, payload);
            if (!row.PARENT_MENU_KEY && settings.some((setting) => setting.MENU_ID === row.MENU_KEY)) {
              const currentSetting = settings.find((setting) => setting.MENU_ID === row.MENU_KEY);
              const executionType = String(row.EXECUTION_TYPE || 'INNER') as MenuExecutionSetting['EXECUTION_TYPE'];
              const designType = String(row.DESIGN_TYPE || 'BASEKIT') as MenuExecutionSetting['DESIGN_TYPE'];
              const previousExecutionType = currentSetting?.EXECUTION_TYPE ?? 'INNER';
              const previousDesignType = currentSetting?.DESIGN_TYPE ?? 'BASEKIT';
              if (operation.state === 'INSERTED' || executionType !== previousExecutionType || designType !== previousDesignType) {
                await saveMenuExecutionSetting({ MENU_ID: row.MENU_KEY, EXECUTION_TYPE: executionType, DESIGN_TYPE: designType });
                window.dispatchEvent(new Event('basekit:menu-execution-settings-changed'));
              }
            }
          }
          acceptedRowIds.push(operation.rowId);
        } catch (error) {
          failures.push({ operation, message: error instanceof Error ? error.message : '저장 실패' });
        }
      }
      let refreshed: MenuRecord[] | null = null;
      let refreshedSettings: MenuExecutionSetting[] | null = null;
      let refreshError = '';
      try { [refreshed, refreshedSettings] = await Promise.all([menuApi.find({}), listMenuExecutionSettings()]); }
      catch (error) { refreshError = error instanceof Error ? error.message : 'DB 재조회에 실패했습니다.'; }
      let reconciledCount = 0;
      if (refreshed && failures.length) {
        const unresolved = failures.filter(({ operation }) => {
          const row = operation.row;
          const persisted = refreshed!.find((item) => item.MENU_KEY === row.MENU_KEY);
          const confirmed = operation.state === 'DELETED' ? !persisted : !!persisted
            && persisted.MENU_NAME === row.MENU_NAME.trim()
            && persisted.PARENT_MENU_KEY === (row.PARENT_MENU_KEY || null)
            && persisted.MENU_TYPE_CODE === row.MENU_TYPE_CODE
            && persisted.SORT_ORDER === Number(row.SORT_ORDER)
            && persisted.PROGRAM_KEY === (row.MENU_TYPE_CODE === 'PAGE' ? row.PROGRAM_KEY : null)
            && persisted.USE_YN === row.USE_YN
            && (!row.PARENT_MENU_KEY
              ? (refreshedSettings!.find((setting) => setting.MENU_ID === row.MENU_KEY)?.EXECUTION_TYPE ?? 'INNER') === String(row.EXECUTION_TYPE || 'INNER')
                && (refreshedSettings!.find((setting) => setting.MENU_ID === row.MENU_KEY)?.DESIGN_TYPE ?? 'BASEKIT') === String(row.DESIGN_TYPE || 'BASEKIT')
              : true);
          if (!confirmed) return true;
          acceptedRowIds.push(operation.rowId);
          reconciledCount++;
          return false;
        });
        failures.splice(0, failures.length, ...unresolved);
        if (reconciledCount) window.dispatchEvent(new Event(MENU_RUNTIME_CHANGED_EVENT));
      }
      if (!failures.length && refreshed) {
        setMenus(refreshed);
        if (refreshedSettings) setSettings(refreshedSettings);
        const nextSelected = selectedKey ? refreshed.find((row) => row.MENU_KEY === selectedKey) : null;
        selectRow(nextSelected ?? refreshed[0] ?? null, refreshed);
        setMessage(`${acceptedRowIds.length}건을 저장하고 DB에서 다시 조회했습니다. 개별 API 순차 저장이며 전체 원자성은 보장하지 않습니다.`);
      } else {
        const completed = acceptedRowIds.length;
        const failureMessage = failures.length ? `개별 API 순차 저장(전체 원자성 미보장): 성공 ${completed}건, 실패 ${failures.length}건입니다. 실패 행은 변경 상태로 남아 재시도할 수 있습니다. ${failures.map(({ operation, message: detail }) => `${operation.row.MENU_KEY || '(새 메뉴)'}: ${detail}`).join(' / ')}` : `저장 요청은 완료됐지만 DB 재조회에 실패했습니다. ${refreshError}`;
        setMessage(failureMessage);
      }
      return { acceptedRowIds };
    } finally { setBusy(false); }
  }

  async function refreshMenus() {
    if (change?.dirty || busy) return;
    setBusy(true); setMessage('');
    try {
      const rows = await reload();
      setChange(null);
      const selected = selectedKey ? rows.find((row) => row.MENU_KEY === selectedKey) : null;
      selectRow(selected ?? rows[0] ?? null, rows);
      setMessage('메뉴를 DB에서 다시 조회했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '메뉴 재조회에 실패했습니다.'); }
    finally { setBusy(false); }
  }

  const validateMenuRows = useCallback((rows: MenuRecord[], getState: (row: MenuRecord) => GridRowState) => {
    const active = rows.filter((row) => getState(row) !== 'DELETED');
    const issues: TreeDataGridIssue[] = [];
    active.forEach((row) => {
      if (row.USE_YN !== 'Y' && row.USE_YN !== 'N') issues.push(issue(row, 'USE_YN', '사용 여부를 선택하세요.'));
      if (row.MENU_TYPE_CODE === 'FOLDER' && row.PROGRAM_KEY) issues.push(issue(row, 'PROGRAM_KEY', 'FOLDER에는 프로그램을 연결할 수 없습니다.'));
      if (row.MENU_TYPE_CODE === 'PAGE' && !row.PROGRAM_KEY) issues.push(issue(row, 'PROGRAM_KEY', 'PAGE 메뉴에 연결할 프로그램을 선택하세요.'));
      if (row.MENU_TYPE_CODE === 'PAGE' && childCount(active, row.MENU_KEY) > 0) issues.push(issue(row, 'MENU_TYPE_CODE', '하위 메뉴가 있는 항목은 PAGE로 변경할 수 없습니다.'));
    });
    return issues;
  }, []);

  const activeSearchFields = useMemo(() => programSearchFields, [programSearchFields]);
  const selectedProgram = programMatches.find((program) => program.PROGRAM_KEY === selectedProgramKey) ?? null;

  return <section className="page menu-manage-page">
    <PageHeader breadcrumbs={['시스템관리', '메뉴관리']} description="메뉴 계층, 표시 순서, 프로그램 연결 및 최상위 실행 설정을 관리합니다." rightContent={<div className="button-area page-actions" role="toolbar" aria-label="메뉴 작업">
      <ActionButton actionCode="SEARCH" label={busy ? '조회 중…' : 'DB 재조회'} disabled={!loaded || busy || !!change?.dirty} onClick={() => void refreshMenus()} />
    </div>} />
    <section className="data-section menu-tree-panel menu-grid-section">
      <h2>메뉴 계층</h2>
      <p className="menu-grid-guidance">셀을 직접 편집합니다. 신규·수정·삭제 항목은 저장 전까지 브라우저에 보관됩니다.</p>
      <TreeDataGrid
        initialRows={gridMenus}
        fields={menuFields}
        columns={columns}
        getKey={(row) => row.MENU_KEY}
        maxDepth={3}
        createRow={(parentId, sortOrder) => ({ MENU_KEY: '', MENU_NAME: '', PARENT_MENU_KEY: parentId, MENU_TYPE_CODE: 'PAGE', SORT_ORDER: sortOrder, PROGRAM_KEY: null, USE_YN: 'Y' as const })}
        canHaveChildren={(row) => row.MENU_TYPE_CODE === 'FOLDER' && !!row.MENU_KEY}
        validateRows={validateMenuRows}
        onChange={onGridChange}
        onRowSelect={(row) => selectRow(row)}
        onSave={saveMenuRows}
        saving={busy}
        labels={{ new: '최상위 추가', addChild: '하위 추가', addSibling: '형제 추가', delete: '삭제', save: '변경 저장', cancel: '취소', expandAll: '전체 펼침', collapseAll: '전체 접힘', search: '메뉴 검색', sort: '형제 순서' }}
        emptyMessage={loaded ? '등록된 메뉴가 없습니다.' : '메뉴를 조회하고 있습니다…'}
      />
      {message && <p className="menu-manage-message" role="status">{message}</p>}
    </section>
    <FormModal
      open={!!programTarget}
      title="프로그램 검색"
      onClose={() => setProgramTarget(null)}
      submitLabel="프로그램 선택"
      submitDisabled={!selectedProgram}
      onSubmit={() => {
        if (!selectedProgram || !programTarget) return;
        programTarget.onChange(selectedProgram.PROGRAM_KEY);
        setProgramTarget(null);
      }}
    >
      <div className="menu-program-search-panel">
        <SearchPanel
          fields={activeSearchFields}
          value={programSearch}
          initialValue={emptyProgramSearch}
          onValueChange={setProgramSearch}
          onSearch={setAppliedProgramSearch}
          onReset={(initial) => { setProgramSearch(initial); setAppliedProgramSearch(initial); }}
        />
      </div>
      <BaseKitDataGrid<Program>
        programKey="MENU_MGMT"
        roleCode="ADMIN"
        title={`사용 가능한 프로그램 · ${programMatches.length}건`}
        columns={programColumns}
        rows={programMatches}
        getRowKey={(row) => row.PROGRAM_KEY}
        currentRowKey={selectedProgramKey ?? undefined}
        onRowClick={(row) => setSelectedProgramKey(row.PROGRAM_KEY)}
        emptyMessage="사용 가능한 프로그램이 없습니다."
      />
    </FormModal>
  </section>;
}
