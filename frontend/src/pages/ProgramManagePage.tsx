import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMMON_ACTIONS } from '../constants/actionCodes';
import BaseKitDataGrid from '../components/grid/BaseKitDataGrid';
import { BaseKitMessage, MasterDetailMultiGrid, PageHeader, SearchPanel, type BaseKitMessageType, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import { getProgramFieldDefinitions } from '../adapters/programFieldAdapter';
import type { FieldDefinition } from '../components/metadata';
import { metadataRepository } from '../repositories/metadataRepository';
import { programApi, type ProgramSave } from '../services/programApi';
import type { ActionMeta, ProgramMeta } from '../types/adminShell';
import type { Program } from '../types/program';
import { findGridValidationIssue, gridValidationIssueMessage, userGridErrorMessage } from '../components/grid/gridFieldValidation';
import { useGridRowState } from '../components/grid/gridRowState';

type RegistryStatus = 'AVAILABLE' | 'NEW' | 'MISSING_SOURCE';
type Condition = { KEYWORD: string; MODULE_CODE: string; PROGRAM_TYPE_CODE: string; USE_YN: string };
type RegistryProgram = Program & { SOURCE_STATUS: RegistryStatus; ACTION_COUNT: number; MENU_COUNT: number; SOURCE_FOUND: 'Y' | 'N' };
type RegistryAction = { ACTION_KEY: string; ACTION_NAME: string; ACTION_TYPE: 'COMMON' | 'CUSTOM'; DESCRIPTION: string; USE_YN: 'Y' | 'N'; SOURCE_STATUS: RegistryStatus; PROGRAM_KEY: string };
type ProgramMessage = { type: BaseKitMessageType; text: string };

const initial: Condition = { KEYWORD: '', MODULE_CODE: '', PROGRAM_TYPE_CODE: '', USE_YN: '' };
const commonActionCodes = new Set<string>(Object.values(COMMON_ACTIONS));
const sourcePrograms: ProgramMeta[] = metadataRepository.getPrograms() as ProgramMeta[];
const sourceActions = metadataRepository.getActions();

function sourceProgramRow(meta: ProgramMeta): RegistryProgram {
  return { REG_DT: '', REG_BY: '', MOD_DT: '', MOD_BY: '', PROGRAM_ID: meta.programKey, PROGRAM_KEY: meta.programKey, PROGRAM_NAME: meta.programName, MODULE_CODE: meta.routePath.startsWith('/system') ? 'SYSTEM' : 'DEV_GUIDE', PROGRAM_TYPE_CODE: meta.screenType === 'HOME' ? 'HOME' : 'GRID_DETAIL', ROUTE: meta.routePath, DESCRIPTION: '', USE_YN: meta.useYn, SOURCE_STATUS: 'NEW', ACTION_COUNT: meta.actionCodes.length, MENU_COUNT: metadataRepository.getMenus().filter((menu) => menu.programKey === meta.programKey).length, SOURCE_FOUND: 'Y' };
}

function mergeRegistryPrograms(dbRows: Program[]): RegistryProgram[] {
  const dbByKey = new Map(dbRows.map((row) => [row.PROGRAM_KEY, row]));
  const sourceKeys = new Set(sourcePrograms.map((program) => program.programKey));
  const rows = sourcePrograms.map((meta) => {
    const db = dbByKey.get(meta.programKey);
    const source = sourceProgramRow(meta);
    return db ? { ...source, ...db, SOURCE_STATUS: 'AVAILABLE' as const, ACTION_COUNT: meta.actionCodes.length, SOURCE_FOUND: 'Y' as const } : source;
  });
  dbRows.filter((row) => !sourceKeys.has(row.PROGRAM_KEY)).forEach((row) => rows.push({ ...row, SOURCE_STATUS: 'MISSING_SOURCE', ACTION_COUNT: 0, MENU_COUNT: 0, SOURCE_FOUND: 'N' }));
  return rows;
}

function getActions(programKey: string): RegistryAction[] {
  const meta = sourcePrograms.find((program) => program.programKey === programKey);
  if (!meta) return [];
  return meta.actionCodes.map((actionCode) => {
    const action = sourceActions.find((candidate) => candidate.actionCode === actionCode) as ActionMeta | undefined;
    return { ACTION_KEY: actionCode, ACTION_NAME: action?.actionName ?? actionCode, ACTION_TYPE: commonActionCodes.has(actionCode) ? 'COMMON' : 'CUSTOM', DESCRIPTION: action ? `${action.actionName} 실행 Action` : 'Source에서 선언한 업무 Action', USE_YN: 'Y', SOURCE_STATUS: 'AVAILABLE', PROGRAM_KEY: programKey };
  });
}

const textField = (key: string, label: string, required = false): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required });
const selectField = (key: string, label: string, options: Array<{ value: string; label: string }>): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'SELECT', displayType: 'TEXT', required: true, options });
const switchField = (key: string, label: string): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: true, options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] });
const badgeField = (key: string, label: string): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'TEXT', displayType: 'BADGE', required: false });
const applyGridValue = <T,>(row: T, key: string, value: string): T => ({ ...row, [key]: value });
const statusColumn = <T extends { SOURCE_STATUS: RegistryStatus }>(key: 'SOURCE_STATUS', header: string): DataTableColumn<T> => ({ key, header, width: 112, align: 'center', fieldDefinition: badgeField(key, header), render: (row) => row.SOURCE_STATUS });

const actionColumns: DataTableColumn<RegistryAction>[] = [
  { key: 'ACTION_KEY', header: 'Action Key', width: 145, render: row => row.ACTION_KEY },
  { key: 'ACTION_NAME', header: 'Action명', minWidth: 150, flex: 1, fieldDefinition: textField('ACTION_NAME', 'Action명', true), render: row => row.ACTION_NAME },
  { key: 'ACTION_TYPE', header: 'Type', width: 90, align: 'center', fieldDefinition: badgeField('ACTION_TYPE', 'Type'), render: row => row.ACTION_TYPE },
  { key: 'DESCRIPTION', header: '설명', minWidth: 220, flex: 2, fieldDefinition: textField('DESCRIPTION', '설명'), render: row => row.DESCRIPTION },
  statusColumn<RegistryAction>('SOURCE_STATUS', 'Source 상태'),
  { key: 'USE_YN', header: '사용', width: 72, align: 'center', fieldDefinition: switchField('USE_YN', '사용여부'), render: row => row.USE_YN },
];

export default function ProgramManagePage() {
  const [condition, setCondition] = useState(initial);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [programSelected, setProgramSelected] = useState(new Set<string>());
  const [actionSelected, setActionSelected] = useState(new Set<string>());
  const [message, setMessage] = useState<ProgramMessage>({ type: 'info', text: 'Source Registry를 조회했습니다.' });
  const [saving, setSaving] = useState(false);
  const initialLoad = useRef(false);
  const programKey = useCallback((row: RegistryProgram) => row.PROGRAM_KEY, []);
  const actionKey = useCallback((row: RegistryAction) => row.ACTION_KEY, []);
  const programs = useGridRowState<RegistryProgram>(programKey);
  const actions = useGridRowState<RegistryAction>(actionKey);
  const replacePrograms = programs.replace;
  const replaceActions = actions.replace;
  const notify = (text: string, type: BaseKitMessageType = 'warn') => setMessage({ type, text });

  const load = useCallback(async (next: Condition) => {
    try {
      const dbRows = await programApi.find(next);
      const merged = mergeRegistryPrograms(dbRows).filter((row) => !next.KEYWORD || `${row.PROGRAM_KEY} ${row.PROGRAM_NAME}`.toLowerCase().includes(next.KEYWORD.toLowerCase()));
      replacePrograms(merged);
      setSelectedKey(current => merged.some(row => row.PROGRAM_KEY === current) ? current : merged[0]?.PROGRAM_KEY ?? '');
      setProgramSelected(new Set());
      notify(`${merged.length}건의 Program Registry를 조회했습니다.`, 'success');
    } catch (error) {
      const merged = mergeRegistryPrograms([]);
      replacePrograms(merged);
      setSelectedKey(merged[0]?.PROGRAM_KEY ?? '');
      notify(`DB Registry를 읽지 못해 Source 기준으로 표시합니다. ${error instanceof Error ? error.message : ''}`);
    }
  }, [replacePrograms]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (!initialLoad.current) { initialLoad.current = true; void getProgramFieldDefinitions().then(setFields).catch(() => setFields([])); void load(initial); } }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedProgram = programs.rows.find(row => row.PROGRAM_KEY === selectedKey);
  useEffect(() => {
    replaceActions(getActions(selectedKey));
  }, [replaceActions, selectedKey]);

  const programFields = useMemo(() => {
    const get = (key: string) => fields.find(field => field.key === key);
    return {
      PROGRAM_NAME: get('PROGRAM_NAME') ?? textField('PROGRAM_NAME', '프로그램명', true),
      DESCRIPTION: get('DESCRIPTION') ?? textField('DESCRIPTION', '설명'),
      MODULE_CODE: get('MODULE_CODE') ?? selectField('MODULE_CODE', 'Module', []),
      PROGRAM_TYPE_CODE: get('PROGRAM_TYPE_CODE') ?? selectField('PROGRAM_TYPE_CODE', '유형', []),
      USE_YN: switchField('USE_YN', '사용여부'),
    };
  }, [fields]);
  const searchFields = useMemo<SearchFieldConfig<Condition>[]>(() => [
    { key: 'KEYWORD', label: '프로그램', placeholder: 'KEY / 프로그램명' },
    { key: 'MODULE_CODE', label: 'Module', controlType: 'select', options: [{ value: '', label: '전체' }, ...(programFields.MODULE_CODE.options ?? [])] },
    { key: 'PROGRAM_TYPE_CODE', label: '유형', controlType: 'select', options: [{ value: '', label: '전체' }, ...(programFields.PROGRAM_TYPE_CODE.options ?? [])] },
    { key: 'USE_YN', label: '사용 여부', controlType: 'select', options: [{ value: '', label: '전체' }, { value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] },
  ], [programFields]);

  const programColumns = useMemo<DataTableColumn<RegistryProgram>[]>(() => [
    statusColumn<RegistryProgram>('SOURCE_STATUS', '상태'),
    { key: 'PROGRAM_KEY', header: 'Program Key', minWidth: 150, flex: 1, render: row => row.PROGRAM_KEY },
    { key: 'PROGRAM_NAME', header: '프로그램명', minWidth: 150, flex: 1, fieldDefinition: programFields.PROGRAM_NAME, render: row => row.PROGRAM_NAME },
    { key: 'DESCRIPTION', header: '설명', minWidth: 220, flex: 2, fieldDefinition: programFields.DESCRIPTION, render: row => row.DESCRIPTION ?? '' },
    { key: 'MODULE_CODE', header: 'Module', width: 130, fieldDefinition: programFields.MODULE_CODE, render: row => row.MODULE_CODE },
    { key: 'PROGRAM_TYPE_CODE', header: '유형', width: 110, fieldDefinition: programFields.PROGRAM_TYPE_CODE, render: row => row.PROGRAM_TYPE_CODE },
    { key: 'ACTION_COUNT', header: 'Action 수', width: 82, align: 'right', render: row => row.ACTION_COUNT },
    { key: 'SOURCE_FOUND', header: 'Source', width: 72, align: 'center', render: row => row.SOURCE_FOUND },
    { key: 'USE_YN', header: '사용', width: 72, align: 'center', fieldDefinition: programFields.USE_YN, render: row => row.USE_YN },
    { key: 'MOD_DT', header: '최종 동기화', width: 130, render: row => row.MOD_DT ? new Date(row.MOD_DT).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
  ], [programFields]);

  const savePrograms = async () => {
    if (!programs.dirty) return notify('저장할 Program 변경사항이 없습니다.', 'info');
    const invalid = findGridValidationIssue([...programs.changeSet.INSERTED, ...programs.changeSet.UPDATED], programColumns);
    if (invalid) return notify(gridValidationIssueMessage(invalid));
    setSaving(true);
    try {
      const saved = await Promise.all(programs.changeSet.UPDATED.map(row => programApi.update(row as ProgramSave)));
      const savedById = new Map(saved.map(row => [row.PROGRAM_ID, row]));
      replacePrograms(programs.rows.map(row => savedById.has(row.PROGRAM_ID) ? { ...row, ...savedById.get(row.PROGRAM_ID) } : row));
      notify(`${saved.length}건의 Program Registry를 저장했습니다.`, 'success');
    } catch (error) { notify(userGridErrorMessage(error, Object.values(programFields), 'Program을 저장하지 못했습니다.'), 'error'); }
    finally { setSaving(false); }
  };

  const saveActions = () => {
    if (!actions.dirty) return notify('저장할 Action 변경사항이 없습니다.', 'info');
    actions.replace(actions.rows.map(row => ({ ...row })));
    notify('Action 변경사항을 현재 화면 원본으로 반영했습니다. 서버 Registry API는 아직 연결되지 않았습니다.', 'warn');
  };
  const programToolbar = [
    { actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '변경취소', disabled: !programs.dirty, onClick: () => { programs.revert(programs.rows.filter(row => programs.getState(row) !== 'NORMAL').map(row => row.__GRID_ROW_ID)); setProgramSelected(new Set()); } },
    { actionCode: COMMON_ACTIONS.SAVE, label: '저장', tone: 'primary' as const, disabled: !programs.dirty || saving, onClick: () => void savePrograms() },
  ];
  const actionToolbar = [
    { actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '변경취소', disabled: !actions.dirty, onClick: () => { actions.revert(actions.rows.filter(row => actions.getState(row) !== 'NORMAL').map(row => row.__GRID_ROW_ID)); setActionSelected(new Set()); } },
    { actionCode: COMMON_ACTIONS.SAVE, label: '저장', tone: 'primary' as const, disabled: !actions.dirty, onClick: saveActions },
  ];

  return <section className="page multi-grid-page program-registry-page">
    <PageHeader breadcrumbs={['시스템관리', '프로그램관리']} description="Source Discovery와 운영 Registry를 Inline Batch Grid로 관리합니다." />
    <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initial} onValueChange={setCondition} onSearch={load} onReset={load} />
    <MasterDetailMultiGrid stacked
      master={<BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title="프로그램 목록" columns={programColumns} rows={programs.rows} getRowKey={row => row.__GRID_ROW_ID} getRowState={programs.getState} currentRowKey={selectedProgram?.__GRID_ROW_ID} selectedRowKeys={programSelected} onSelectedRowKeysChange={setProgramSelected} onRowClick={row => setSelectedKey(row.PROGRAM_KEY)} editing={{ keys: ['PROGRAM_NAME', 'DESCRIPTION', 'MODULE_CODE', 'PROGRAM_TYPE_CODE', 'USE_YN'], onChange: (row, key, value) => programs.update(row.__GRID_ROW_ID, current => applyGridValue(current, key, value)) }} toolbarActions={programToolbar} />}
      detailTop={<BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title={`${selectedKey || '선택 Program'} Action 목록`} columns={actionColumns} rows={actions.rows} getRowKey={row => row.__GRID_ROW_ID} getRowState={actions.getState} selectedRowKeys={actionSelected} onSelectedRowKeysChange={setActionSelected} editing={{ keys: ['ACTION_NAME', 'DESCRIPTION', 'USE_YN'], onChange: (row, key, value) => actions.update(row.__GRID_ROW_ID, current => applyGridValue(current, key, value)) }} toolbarActions={actionToolbar} />}
      detailBottom={null}
      message={<BaseKitMessage type={message.type} message={message.text} />}
    />
  </section>;
}
