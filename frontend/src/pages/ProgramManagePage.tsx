import { useCallback, useEffect, useMemo, useState } from 'react';
import { COMMON_ACTIONS, type ActionCode } from '../constants/actionCodes';
import BaseKitDataGrid from '../components/grid/BaseKitDataGrid';
import { MetadataSwitch } from '../components/grid/gridCellComponents';
import { BaseKitMessage, MasterDetailMultiGrid, PageHeader, ProgramDataGrid, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import { getProgramFieldDefinitions } from '../adapters/programFieldAdapter';
import type { FieldDefinition } from '../components/metadata';
import { metadataRepository } from '../repositories/metadataRepository';
import { programApi } from '../services/programApi';
import type { ActionMeta, ProgramMeta } from '../types/adminShell';
import type { Program } from '../types/program';

type RegistryStatus = 'AVAILABLE' | 'NEW' | 'MISSING_SOURCE';
type Condition = { KEYWORD: string; MODULE_CODE: string; PROGRAM_TYPE_CODE: string; USE_YN: string };
type RegistryProgram = Program & { SOURCE_STATUS: RegistryStatus; ACTION_COUNT: number; MENU_COUNT: number; SOURCE_FOUND: 'Y' | 'N' };
type RegistryAction = { ACTION_KEY: ActionCode; ACTION_NAME: string; ACTION_TYPE: 'COMMON' | 'CUSTOM'; DESCRIPTION: string; USE_YN: 'Y' | 'N'; SOURCE_STATUS: RegistryStatus; PROGRAM_KEY: string };

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

const programColumns: DataTableColumn<RegistryProgram>[] = [
  { key: 'SOURCE_STATUS', header: '상태', width: 112, align: 'center', render: (row) => <span className="metadata-badge">{row.SOURCE_STATUS}</span> },
  { key: 'PROGRAM_KEY', header: 'Program Key', minWidth: 145, flex: 1, render: (row) => row.PROGRAM_KEY },
  { key: 'PROGRAM_NAME', header: '프로그램명', minWidth: 125, flex: 1, render: (row) => row.PROGRAM_NAME },
  { key: 'ACTION_COUNT', header: 'Action 수', width: 70, align: 'right', render: (row) => row.ACTION_COUNT },
  { key: 'SOURCE_FOUND', header: 'Source', width: 70, align: 'center', render: (row) => row.SOURCE_FOUND },
  { key: 'USE_YN', header: '사용', width: 55, align: 'center', render: (row) => row.USE_YN },
  { key: 'MOD_DT', header: '최종 동기화일', width: 130, render: (row) => row.MOD_DT ? new Date(row.MOD_DT).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
];
const actionColumns: DataTableColumn<RegistryAction>[] = [
  { key: 'ACTION_KEY', header: 'Action Key', width: 125, render: (row) => row.ACTION_KEY },
  { key: 'ACTION_NAME', header: 'Action명', minWidth: 90, flex: 1, render: (row) => row.ACTION_NAME },
  { key: 'ACTION_TYPE', header: 'Type', width: 78, align: 'center', render: (row) => <span className="metadata-badge">{row.ACTION_TYPE}</span> },
  { key: 'USE_YN', header: '사용', width: 55, align: 'center', render: (row) => row.USE_YN },
  { key: 'SOURCE_STATUS', header: 'Source', width: 100, align: 'center', render: (row) => row.SOURCE_STATUS },
];

type DetailItem = { key: string; label: string; owner: 'SOURCE' | 'REGISTRY'; editor: 'TEXT' | 'SELECT' | 'SWITCH' | 'BADGE'; options?: Array<{ value: string; label: string }> };

function DetailPanel({ title, fields, values, onChange }: { title: string; fields: DetailItem[]; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return <section className="detail-section">
    <h2>{title}</h2>
    <div className="standard-form-grid detail-grid">
      {fields.map((field) => <label key={field.key}>
        <span>{field.label}</span>
        {field.editor === 'SWITCH' ? <MetadataSwitch value={values[field.key] ?? 'Y'} field={{ key: field.key, label: field.label, dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: false, options: field.options }} editable={field.owner === 'REGISTRY'} onChange={(value) => onChange(field.key, value)} />
          : field.owner === 'SOURCE' ? <span className="readonly-field">{values[field.key] || '-'}</span>
            : field.editor === 'SELECT' ? <select value={values[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              : field.editor === 'BADGE' ? <span className="metadata-badge">{values[field.key] || '-'}</span>
                : <input value={values[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} />}
      </label>)}
    </div>
  </section>;
}

export default function ProgramManagePage() {
  const [condition, setCondition] = useState(initial);
  const [rows, setRows] = useState<RegistryProgram[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedActionKey, setSelectedActionKey] = useState('');
  const [actionUseByKey, setActionUseByKey] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'info' | 'warn' | 'error' | 'success'; text: string }>({ type: 'info', text: 'Source Registry를 조회했습니다.' });
  const load = useCallback(async (next: Condition) => {
    try {
      const dbRows = await programApi.find(next);
      const merged = mergeRegistryPrograms(dbRows).filter((row) => !next.KEYWORD || `${row.PROGRAM_KEY} ${row.PROGRAM_NAME}`.toLowerCase().includes(next.KEYWORD.toLowerCase()));
      setRows(merged); setSelectedKey((current) => merged.some((row) => row.PROGRAM_KEY === current) ? current : merged[0]?.PROGRAM_KEY ?? ''); setMessage({ type: 'success', text: `${merged.length}건의 Program Registry를 조회했습니다.` });
    } catch (error) {
      const merged = mergeRegistryPrograms([]); setRows(merged); setSelectedKey(merged[0]?.PROGRAM_KEY ?? ''); setMessage({ type: 'warn', text: `DB Registry를 읽지 못해 Source 기준으로 표시합니다. ${error instanceof Error ? error.message : ''}` });
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void getProgramFieldDefinitions().then(setFields).catch(() => setFields([])); void load(initial); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const selectedProgram = rows.find((row) => row.PROGRAM_KEY === selectedKey);
  const actions = useMemo(() => getActions(selectedKey), [selectedKey]);
  const selectedAction = actions.find((row) => row.ACTION_KEY === selectedActionKey) ?? actions[0];
  const updateProgram = (key: string, value: string) => setRows((current) => current.map((row) => row.PROGRAM_KEY === selectedKey ? { ...row, [key]: value } : row));
  const updateAction = (key: string, value: string) => { if (key === 'USE_YN' && selectedAction) setActionUseByKey((current) => ({ ...current, [`${selectedKey}:${selectedAction.ACTION_KEY}`]: value })); };
  const searchFields = useMemo<SearchFieldConfig<Condition>[]>(() => [
    { key: 'KEYWORD', label: '프로그램', placeholder: 'KEY / 프로그램명' },
    { key: 'MODULE_CODE', label: 'Module', controlType: 'select', options: [{ value: '', label: '전체' }, ...(fields.find((field) => field.key === 'MODULE_CODE')?.options ?? [])] },
    { key: 'PROGRAM_TYPE_CODE', label: '유형', controlType: 'select', options: [{ value: '', label: '전체' }, ...(fields.find((field) => field.key === 'PROGRAM_TYPE_CODE')?.options ?? [])] },
    { key: 'USE_YN', label: '사용 여부', controlType: 'select', options: [{ value: '', label: '전체' }, { value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] },
  ], [fields]);
  const programDetailFields: DetailItem[] = [
    { key: 'PROGRAM_KEY', label: 'Program Key', owner: 'SOURCE', editor: 'TEXT' }, { key: 'PROGRAM_NAME', label: '프로그램명', owner: 'REGISTRY', editor: 'TEXT' }, { key: 'DESCRIPTION', label: '설명', owner: 'REGISTRY', editor: 'TEXT' }, { key: 'MODULE_CODE', label: 'Module', owner: 'REGISTRY', editor: 'SELECT', options: [{ value: 'SYSTEM', label: '시스템관리' }, { value: 'DEV_GUIDE', label: '개발자가이드' }, { value: 'STANDARD_DESIGN', label: 'Standard Design' }] }, { key: 'PROGRAM_TYPE_CODE', label: '유형', owner: 'REGISTRY', editor: 'SELECT', options: [{ value: 'HOME', label: '홈' }, { value: 'GRID', label: '목록' }, { value: 'GRID_DETAIL', label: '목록/상세' }, { value: 'POPUP', label: '팝업' }] }, { key: 'SOURCE_STATUS', label: 'Source 상태', owner: 'SOURCE', editor: 'BADGE' }, { key: 'USE_YN', label: '사용여부', owner: 'REGISTRY', editor: 'SWITCH', options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] }, { key: 'ACTION_COUNT', label: 'Action 수', owner: 'SOURCE', editor: 'TEXT' },
  ];
  const actionDetailFields: DetailItem[] = [
    { key: 'ACTION_KEY', label: 'Action Key', owner: 'SOURCE', editor: 'TEXT' }, { key: 'ACTION_NAME', label: 'Action명', owner: 'SOURCE', editor: 'TEXT' }, { key: 'ACTION_TYPE', label: 'Type', owner: 'SOURCE', editor: 'BADGE' }, { key: 'DESCRIPTION', label: '설명', owner: 'SOURCE', editor: 'TEXT' }, { key: 'SOURCE_STATUS', label: 'Source 상태', owner: 'SOURCE', editor: 'BADGE' }, { key: 'USE_YN', label: '사용여부', owner: 'REGISTRY', editor: 'SWITCH', options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] },
  ];
  const asValues = (value: object | undefined) => Object.fromEntries(Object.entries(value ?? {}).map(([key, item]) => [key, String(item ?? '')]));
  const selectedActionValues = selectedAction ? { ...asValues(selectedAction), USE_YN: actionUseByKey[`${selectedKey}:${selectedAction.ACTION_KEY}`] ?? selectedAction.USE_YN } : {};
  return <section className="page multi-grid-page program-registry-page">
    <PageHeader breadcrumbs={['시스템관리', '프로그램관리']} description="Source Discovery와 운영 Registry의 상태 및 Action Metadata를 조회합니다." />
    <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initial} onValueChange={setCondition} onSearch={load} onReset={load} />
    <MasterDetailMultiGrid equalRows masterWidth="60%"
      master={<div className="multi-grid-detail equal-detail-rows"><div className="multi-grid-detail-top"><ProgramDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title="프로그램 목록" columns={programColumns} rows={rows} getRowKey={(row) => row.PROGRAM_KEY} selectable={false} enabledActions={[]} onRowClick={(row) => setSelectedKey(row.PROGRAM_KEY)} getRowClassName={(row) => row.PROGRAM_KEY === selectedKey ? 'active-master-row' : ''} /></div><div className="multi-grid-detail-bottom"><BaseKitDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" title={`${selectedProgram?.PROGRAM_KEY ?? '프로그램'} Action 목록`} columns={actionColumns} rows={actions} getRowKey={(row) => row.ACTION_KEY} selectable={false} enabledActions={[]} onRowClick={(row) => setSelectedActionKey(row.ACTION_KEY)} getRowClassName={(row) => row.ACTION_KEY === selectedAction?.ACTION_KEY ? 'active-master-row' : ''} /></div></div>}
      detailTop={<DetailPanel title="프로그램 상세정보" fields={programDetailFields} values={asValues(selectedProgram)} onChange={updateProgram} />}
      detailBottom={<DetailPanel title="Action 상세정보" fields={actionDetailFields} values={selectedActionValues} onChange={updateAction} />}
      message={<BaseKitMessage type={message.type} message={message.text} />}
    />
  </section>;
}
