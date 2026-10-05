import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMMON_ACTIONS } from '../constants/actionCodes';
import BaseKitDataGrid from '../components/grid/BaseKitDataGrid';
import { BaseKitMessage, MasterDetailMultiGrid, PageHeader, SearchPanel, type BaseKitMessageType, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import { getProgramFieldDefinitions } from '../adapters/programFieldAdapter';
import type { FieldDefinition } from '../components/metadata';
import { metadataRepository } from '../repositories/metadataRepository';
import { programApi, type ProgramSave, type ButtonGroup, type Endpoint } from '../services/programApi';
import type { ProgramMeta } from '../types/adminShell';
import type { Program } from '../types/program';
import { findGridValidationIssue, gridValidationIssueMessage, userGridErrorMessage } from '../components/grid/gridFieldValidation';
import { useGridRowState } from '../components/grid/gridRowState';

type RegistryStatus = 'AVAILABLE' | 'NEW' | 'MISSING_SOURCE';
type Condition = { KEYWORD: string; MODULE_CODE: string; PROGRAM_TYPE_CODE: string; USE_YN: string };
type RegistryProgram = Program & { SOURCE_STATUS: RegistryStatus; ACTION_COUNT: number; MENU_COUNT: number; SOURCE_FOUND: 'Y' | 'N' };
type ProgramMessage = { type: BaseKitMessageType; text: string };

const initial: Condition = { KEYWORD: '', MODULE_CODE: '', PROGRAM_TYPE_CODE: '', USE_YN: '' };
const sourcePrograms: ProgramMeta[] = metadataRepository.getPrograms() as ProgramMeta[];

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

const textField = (key: string, label: string, required = false): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required });
const selectField = (key: string, label: string, options: Array<{ value: string; label: string }>): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'SELECT', displayType: 'TEXT', required: true, options });
const switchField = (key: string, label: string): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: true, options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] });
const badgeField = (key: string, label: string): FieldDefinition => ({ key, label, dataType: 'STRING', controlType: 'TEXT', displayType: 'BADGE', required: false });
const applyGridValue = <T,>(row: T, key: string, value: string): T => ({ ...row, [key]: value });
const statusColumn = <T extends { SOURCE_STATUS: RegistryStatus }>(key: 'SOURCE_STATUS', header: string): DataTableColumn<T> => ({ key, header, width: 112, align: 'center', fieldDefinition: badgeField(key, header), render: (row) => row.SOURCE_STATUS });

const actionColumns: DataTableColumn<ButtonGroup>[] = [
  { key: 'GROUP_TYPE', header: '구분', width: 100, fieldDefinition: selectField('GROUP_TYPE', '구분', [{ value: 'COMMON', label: 'COMMON' }, { value: 'CUSTOM', label: 'CUSTOM' }]), render: row => row.GROUP_TYPE },
  { key: 'GROUP_CODE', header: '권한 그룹 코드', width: 170, fieldDefinition: textField('GROUP_CODE', '권한 그룹 코드', true), render: row => row.GROUP_CODE },
  { key: 'GROUP_NAME', header: '권한 그룹명', minWidth: 150, flex: 1, fieldDefinition: textField('GROUP_NAME', '권한 그룹명', true), render: row => row.GROUP_NAME },
  { key: 'DESCRIPTION', header: '설명', minWidth: 220, flex: 2, fieldDefinition: textField('DESCRIPTION', '설명'), render: row => row.DESCRIPTION },
  { key: 'USE_YN', header: '사용', width: 72, align: 'center', fieldDefinition: switchField('USE_YN', '사용여부'), render: row => row.USE_YN },
];
const endpointColumns: DataTableColumn<Endpoint>[] = [
  { key: 'MAPPING_STATUS', header: 'Program 연결', width: 145, fieldDefinition: badgeField('MAPPING_STATUS','Program 연결'), render: row => row.MAPPING_STATUS },
  { key: 'HTTP_METHOD', header: 'Method', width: 90, render: row => row.HTTP_METHOD },
  { key: 'PATH', header: 'Endpoint Path', minWidth: 240, flex: 2, render: row => row.PATH },
  { key: 'CONTROLLER_CLASS', header: 'Controller Class', minWidth: 220, flex: 1, render: row => row.CONTROLLER_CLASS },
  { key: 'HANDLER_METHOD', header: 'Handler Method', minWidth: 180, flex: 1, render: row => row.HANDLER_METHOD },
  { key: 'COLLECTION_STATUS', header: '수집 상태', width: 105, render: row => row.COLLECTION_STATUS },
  { key: 'GROUP_CODE', header: '추가 버튼 권한 그룹', minWidth: 180, flex: 1, render: row => row.GROUP_CODE ?? 'Program 권한' },
];

export default function ProgramManagePage() {
  const [condition, setCondition] = useState(initial);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [programSelected, setProgramSelected] = useState(new Set<string>());
  const [actionSelected, setActionSelected] = useState(new Set<string>());
  const [message, setMessage] = useState<ProgramMessage>({ type: 'info', text: 'Source Registry를 조회했습니다.' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [endpointSelected, setEndpointSelected] = useState(new Set<string>());
  const [endpointScope, setEndpointScope] = useState('MAPPED');
  const [mappingGroup, setMappingGroup] = useState('');
  const detailVersion = useRef(0);
  const initialLoad = useRef(false);
  const programKey = useCallback((row: RegistryProgram) => row.PROGRAM_KEY, []);
  const actionKey = useCallback((row: ButtonGroup) => row.GROUP_CODE, []);
  const programs = useGridRowState<RegistryProgram>(programKey);
  const actions = useGridRowState<ButtonGroup>(actionKey);
  const replacePrograms = programs.replace;
  const replaceActions = actions.replace;
  const notify = (text: string, type: BaseKitMessageType = 'warn') => setMessage({ type, text });

  const load = useCallback(async (next: Condition) => {
    setLoading(true);
    try {
      const dbRows = await programApi.find(next);
      const merged = mergeRegistryPrograms(dbRows).filter((row) => (!next.KEYWORD || `${row.PROGRAM_KEY} ${row.PROGRAM_NAME}`.toLowerCase().includes(next.KEYWORD.toLowerCase()))
        && (!next.MODULE_CODE || row.MODULE_CODE === next.MODULE_CODE) && (!next.PROGRAM_TYPE_CODE || row.PROGRAM_TYPE_CODE === next.PROGRAM_TYPE_CODE) && (!next.USE_YN || row.USE_YN === next.USE_YN));
      replacePrograms(merged);
      setSelectedKey(current => merged.some(row => row.PROGRAM_KEY === current) ? current : '');
      setProgramSelected(new Set());
      notify(`${merged.length}건의 Program Registry를 조회했습니다.`, 'success');
    } catch (error) {
      replacePrograms([]);
      setSelectedKey('');
      notify(`Program 조회에 실패했습니다. ${error instanceof Error ? error.message : ''}`, 'error');
    } finally { setLoading(false); }
  }, [replacePrograms]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (!initialLoad.current) { initialLoad.current = true; void getProgramFieldDefinitions().then(setFields).catch(() => setFields([])); void load(initial); } }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedProgram = programs.rows.find(row => row.PROGRAM_KEY === selectedKey);
  const selectedProgramId = selectedProgram?.SOURCE_STATUS === 'NEW' ? '' : selectedProgram?.PROGRAM_ID ?? '';
  const loadDetails = useCallback(async (id: string) => {
    const version = ++detailVersion.current;
    replaceActions([]); setEndpoints([]); setActionSelected(new Set()); setEndpointSelected(new Set()); setMappingGroup(''); setDetailError('');
    if (!id) { setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const [groups, rows] = await Promise.all([programApi.groups(id), programApi.endpoints(id)]);
      if (version !== detailVersion.current) return;
      replaceActions(groups); setEndpoints(rows);
    } catch (error) {
      if (version === detailVersion.current) setDetailError(error instanceof Error ? error.message : '상세 조회에 실패했습니다.');
    } finally { if (version === detailVersion.current) setDetailLoading(false); }
  }, [replaceActions]);
  useEffect(() => {
    const versionRef = detailVersion;
    const timer = window.setTimeout(() => void loadDetails(selectedProgramId), 0);
    return () => { window.clearTimeout(timer); versionRef.current++; };
  }, [loadDetails, selectedProgramId]);

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
      const saved = await Promise.all(programs.changeSet.UPDATED.map(row => row.SOURCE_STATUS === 'NEW' ? programApi.create(row as ProgramSave) : programApi.update(row as ProgramSave)));
      const savedById = new Map(saved.map(row => [row.PROGRAM_ID, row]));
      replacePrograms(programs.rows.map(row => savedById.has(row.PROGRAM_ID) ? { ...row, ...savedById.get(row.PROGRAM_ID), SOURCE_STATUS: 'AVAILABLE' } : row));
      notify(`${saved.length}건의 Program Registry를 저장했습니다.`, 'success');
    } catch (error) { notify(userGridErrorMessage(error, Object.values(programFields), 'Program을 저장하지 못했습니다.'), 'error'); }
    finally { setSaving(false); }
  };

  const saveActions = async () => {
    const rows = actions.rows.filter(row => actions.getState(row) !== 'DELETED');
    const invalid = findGridValidationIssue(rows, actionColumns);
    if (invalid) return notify(gridValidationIssueMessage(invalid));
    const version = detailVersion.current;
    setSaving(true);
    try {
      const groups = await programApi.saveGroups(selectedProgramId, rows);
      if (version === detailVersion.current) { replaceActions(groups); notify('버튼 권한 그룹을 저장했습니다.', 'success'); }
    } catch (error) { notify(error instanceof Error ? error.message : '권한 그룹 저장에 실패했습니다.', 'error'); }
    finally { setSaving(false); }
  };
  const changeMapping = async (remove: boolean) => {
    setSaving(true);
    try {
      // Each endpoint operation is transactional. Refresh even on partial failure.
      for (const id of endpointSelected) {
        if (remove) await programApi.unmapEndpoint(selectedProgramId, id);
        else await programApi.mapEndpoint(selectedProgramId, id, mappingGroup || null);
      }
      notify(remove ? '선택 Program 연결을 해제했습니다.' : '선택 Program과 Endpoint를 연결했습니다.', 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Endpoint 연결에 실패했습니다.', 'error'); }
    finally { await loadDetails(selectedProgramId); setSaving(false); }
  };
  const programToolbar = [
    { actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '변경취소', disabled: !programs.dirty, onClick: () => { programs.revert(programs.rows.filter(row => programs.getState(row) !== 'NORMAL').map(row => row.__GRID_ROW_ID)); setProgramSelected(new Set()); } },
    { actionCode: COMMON_ACTIONS.SAVE, label: '저장', tone: 'primary' as const, disabled: !programs.dirty || saving, onClick: () => void savePrograms() },
  ];
  const actionToolbar = [
    { actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '변경취소', disabled: !actions.dirty, onClick: () => { actions.revert(actions.rows.filter(row => actions.getState(row) !== 'NORMAL').map(row => row.__GRID_ROW_ID)); setActionSelected(new Set()); } },
    { actionCode: COMMON_ACTIONS.SAVE, label: '저장', tone: 'primary' as const, disabled: !actions.dirty || saving || detailLoading || !!detailError, onClick: () => void saveActions() },
    { actionCode: COMMON_ACTIONS.CREATE, label: '그룹추가', disabled: !selectedProgramId || saving || detailLoading || !!detailError, onClick: () => actions.add({ GROUP_TYPE: 'CUSTOM', GROUP_CODE: '', GROUP_NAME: '', DESCRIPTION: '', USE_YN: 'Y' }) },
    { actionCode: COMMON_ACTIONS.DELETE, label: '그룹삭제', disabled: !actionSelected.size || saving, onClick: () => actions.remove(actionSelected) },
  ];
  const detailEmpty = detailError || (!selectedKey ? '프로그램을 선택하세요.' : !selectedProgramId ? 'DB에 등록된 프로그램을 선택하세요.' : '조회 결과가 없습니다.');
  const visibleEndpoints = endpoints.filter(row => endpointScope === 'ALL' || row.MAPPING_STATUS === endpointScope);
  const selectProgram = (key: string) => {
    if (saving || detailLoading) return;
    if (actions.dirty && !window.confirm('저장하지 않은 권한 그룹 변경사항을 취소하고 프로그램을 변경하시겠습니까?')) return;
    setSelectedKey(key);
  };
  const search = (next: Condition) => {
    if (saving || detailLoading) return;
    if ((actions.dirty || programs.dirty) && !window.confirm('저장하지 않은 변경사항을 취소하고 조회하시겠습니까?')) return;
    void load(next);
    void loadDetails(selectedProgramId);
  };

  return <section className="page multi-grid-page program-registry-page">
    <PageHeader breadcrumbs={['시스템관리', '프로그램관리']} description="프로그램별 버튼 권한 그룹과 자동수집 Endpoint 연결을 관리합니다." />
    <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initial} onValueChange={setCondition} onSearch={search} onReset={search} />
    <MasterDetailMultiGrid stacked resizable
      master={<BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title="프로그램 목록" columns={programColumns} rows={programs.rows} loading={loading} getRowKey={row => row.__GRID_ROW_ID} getRowState={programs.getState} currentRowKey={selectedProgram?.__GRID_ROW_ID} selectedRowKeys={programSelected} onSelectedRowKeysChange={setProgramSelected} onRowClick={row => selectProgram(row.PROGRAM_KEY)} editing={{ keys: ['PROGRAM_NAME', 'DESCRIPTION', 'MODULE_CODE', 'PROGRAM_TYPE_CODE', 'USE_YN'], onChange: (row, key, value) => programs.update(row.__GRID_ROW_ID, current => applyGridValue(current, key, value)) }} toolbarActions={programToolbar} />}
      detailTop={<BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title={`${selectedKey || '선택 Program'} 버튼 권한 그룹`} columns={actionColumns} rows={actions.rows} loading={detailLoading} emptyMessage={detailEmpty} getRowKey={row => row.__GRID_ROW_ID} getRowState={actions.getState} selectedRowKeys={actionSelected} onSelectedRowKeysChange={setActionSelected} editing={saving ? undefined : { keys: ['GROUP_CODE', 'GROUP_TYPE', 'GROUP_NAME', 'DESCRIPTION', 'USE_YN'], onChange: (row, key, value) => actions.update(row.__GRID_ROW_ID, current => applyGridValue(current, key, value)) }} toolbarActions={actionToolbar} />}
      detailBottom={<div className="program-endpoint-detail">
        <div className="program-endpoint-controls">
          <label>표시 <select aria-label="Endpoint 표시 범위" value={endpointScope} onChange={event => { setEndpointScope(event.target.value); setEndpointSelected(new Set()); }}><option value="MAPPED">선택 Program 연결</option><option value="UNMAPPED">UNMAPPED</option><option value="ALL">전체 수집 Endpoint</option></select></label>
          <label>추가 권한 <select aria-label="추가 버튼 권한 그룹" value={mappingGroup} onChange={event => setMappingGroup(event.target.value)} disabled={actions.dirty || saving}><option value="">Program 권한만</option>{actions.rows.filter(row => row.USE_YN === 'Y').map(row => <option key={row.__GRID_ROW_ID} value={row.GROUP_CODE}>{row.GROUP_CODE}</option>)}</select></label>
        </div>
        <BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title={`${selectedKey || '선택 Program'} Endpoint 목록`} columns={endpointColumns} rows={visibleEndpoints} loading={detailLoading} emptyMessage={detailEmpty} getRowKey={row => row.ENDPOINT_ID} selectedRowKeys={endpointSelected} onSelectedRowKeysChange={setEndpointSelected}
          metrics={[{ label: 'UNMAPPED', value: endpoints.filter(row => row.MAPPING_STATUS === 'UNMAPPED').length, tone: 'danger' }]}
          toolbarActions={[
            { actionCode: COMMON_ACTIONS.SEARCH, label: '새로고침', disabled: !selectedProgramId || saving || actions.dirty, onClick: () => void loadDetails(selectedProgramId) },
            { actionCode: COMMON_ACTIONS.SAVE, label: 'Program 연결', disabled: !endpointSelected.size || saving || actions.dirty || detailLoading, onClick: () => void changeMapping(false) },
            { actionCode: COMMON_ACTIONS.DELETE, label: '연결해제', disabled: !endpointSelected.size || saving || actions.dirty || detailLoading, onClick: () => void changeMapping(true) },
          ]} />
      </div>}
      message={<BaseKitMessage type={detailError ? 'error' : message.type} message={detailError || message.text} />}
    />
  </section>;
}
