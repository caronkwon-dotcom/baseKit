import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import FormField from '../../../components/common/FormField';
import FormModal from '../../../components/common/FormModal';
import PageHeader from '../../../components/common/PageHeader';
import type { DataTableColumn } from '../../../components/common/DataTable';
import type { GridToolbarAction } from '../../../components/common/ProgramDataGrid';
import BaseKitDataGrid, { type GridEditing } from '../../../components/grid/BaseKitDataGrid';
import { findGridValidationIssue, gridValidationIssueMessage } from '../../../components/grid/gridFieldValidation';
import { useGridRowState, type TrackedGridRow } from '../../../components/grid/gridRowState';
import type { FieldDefinition } from '../../../components/metadata/fieldDefinition';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { hasAction } from '../../../repositories/metadataRepository';
import { documentNumberApi, type DocumentNumberIssue, type DocumentNumberRule, type RuleSave } from './documentNumberApi';
import { validateDocumentNumberRule } from './documentNumberValidation';
import './documentNumberManagement.css';

type RuleRow = DocumentNumberRule;
const EMPTY_RULE: RuleRow = {
  RULE_KEY: '', RULE_VERSION: 0, RULE_NAME: '', PREFIX: '', DATE_FORMAT: 'NONE', SEQUENCE_LENGTH: 4,
  START_VALUE: 1, INCREMENT_VALUE: 1, RESET_CYCLE: 'NONE', SCOPE_TYPE: 'GLOBAL', USE_YN: 'Y',
  DESCRIPTION: '', CURRENT_VALUE: 0, REG_DT: '', REG_BY: '', MOD_DT: '', MOD_BY: '',
};
const ruleKey = (row: RuleRow) => `${row.RULE_KEY}:${row.RULE_VERSION}`;
const labels: Record<string, string> = {
  NONE: '없음', YEAR: '연', MONTH: '월', GLOBAL: '전체', MODULE: '모듈', PROJECT: '프로젝트', Y: '사용', N: '중지',
};
const options = (values: string[]) => values.map((value) => ({ value, label: labels[value] ?? value }));
const stringField = (key: string, label: string, required = false, maxLength?: number): FieldDefinition => ({
  key, label, dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required, maxLength,
});
const numberField = (key: string, label: string): FieldDefinition => ({
  key, label, dataType: 'NUMBER', controlType: 'NUMBER', displayType: 'NUMBER', required: true,
});
const selectField = (key: string, label: string, values: string[]): FieldDefinition => ({
  key, label, dataType: 'STRING', controlType: 'SELECT', displayType: 'TEXT', required: true,
  gridControlDisplay: 'always', options: options(values),
});

const fields = {
  RULE_KEY: stringField('RULE_KEY', 'RULE KEY', true, 80),
  RULE_NAME: stringField('RULE_NAME', '규칙명', true, 160),
  PREFIX: stringField('PREFIX', '접두어', true, 40),
  DATE_FORMAT: selectField('DATE_FORMAT', '날짜 형식', ['NONE', 'YYYY', 'YYYYMM']),
  SEQUENCE_LENGTH: numberField('SEQUENCE_LENGTH', '순번 자리수'),
  START_VALUE: numberField('START_VALUE', '시작값'),
  INCREMENT_VALUE: numberField('INCREMENT_VALUE', '증가량'),
  RESET_CYCLE: selectField('RESET_CYCLE', '초기화 주기', ['NONE', 'YEAR', 'MONTH']),
  SCOPE_TYPE: selectField('SCOPE_TYPE', '적용 범위', ['GLOBAL', 'MODULE', 'PROJECT']),
  USE_YN: selectField('USE_YN', '사용 여부', ['Y', 'N']),
};

const formatKeys = new Set(['PREFIX', 'DATE_FORMAT', 'SEQUENCE_LENGTH', 'START_VALUE', 'INCREMENT_VALUE', 'RESET_CYCLE', 'SCOPE_TYPE']);
const baseColumns: DataTableColumn<RuleRow>[] = [
  { key: 'RULE_KEY', header: 'RULE KEY', width: 150, editPolicy: 'read-only', fieldDefinition: fields.RULE_KEY, render: row => row.RULE_KEY },
  { key: 'RULE_VERSION', header: '버전', width: 70, render: row => row.RULE_VERSION || '신규' },
  { key: 'RULE_NAME', header: '규칙명', width: 180, fieldDefinition: fields.RULE_NAME, render: row => row.RULE_NAME },
  { key: 'PREFIX', header: '접두어', width: 120, fieldDefinition: fields.PREFIX, render: row => row.PREFIX },
  { key: 'DATE_FORMAT', header: '날짜 형식', width: 120, fieldDefinition: fields.DATE_FORMAT, render: row => row.DATE_FORMAT },
  { key: 'SEQUENCE_LENGTH', header: '순번 자리수', width: 110, fieldDefinition: fields.SEQUENCE_LENGTH, render: row => row.SEQUENCE_LENGTH },
  { key: 'START_VALUE', header: '시작값', width: 100, fieldDefinition: fields.START_VALUE, render: row => row.START_VALUE },
  { key: 'INCREMENT_VALUE', header: '증가량', width: 100, fieldDefinition: fields.INCREMENT_VALUE, render: row => row.INCREMENT_VALUE },
  { key: 'RESET_CYCLE', header: '초기화 주기', width: 120, fieldDefinition: fields.RESET_CYCLE, render: row => row.RESET_CYCLE },
  { key: 'SCOPE_TYPE', header: '적용 범위', width: 120, fieldDefinition: fields.SCOPE_TYPE, render: row => row.SCOPE_TYPE },
  { key: 'USE_YN', header: '사용 여부', width: 100, fieldDefinition: fields.USE_YN, render: row => row.USE_YN },
  { key: 'CURRENT_VALUE', header: '현재 순번', width: 110, align: 'right', render: row => row.CURRENT_VALUE.toLocaleString() },
];
const ruleFields = Object.values(fields);

const toSave = (row: RuleRow): RuleSave => ({
  RULE_KEY: row.RULE_KEY.trim(), RULE_NAME: row.RULE_NAME.trim(), PREFIX: row.PREFIX.trim(),
  DATE_FORMAT: row.DATE_FORMAT, SEQUENCE_LENGTH: Number(row.SEQUENCE_LENGTH), START_VALUE: Number(row.START_VALUE),
  INCREMENT_VALUE: Number(row.INCREMENT_VALUE), RESET_CYCLE: row.RESET_CYCLE, SCOPE_TYPE: row.SCOPE_TYPE,
  USE_YN: row.USE_YN, DESCRIPTION: row.DESCRIPTION ?? '',
});
const toRuleRow = (rule: DocumentNumberRule): RuleRow => ({ ...rule, DESCRIPTION: rule.DESCRIPTION ?? '' });

export default function DocumentNumberManagePage() {
  const grid = useGridRowState<RuleRow>(ruleKey);
  const { rows, replace, add, update, revert, getState, changeSet, dirty } = grid;
  const gridStateReader = useRef(getState);
  useLayoutEffect(() => { gridStateReader.current = getState; }, [getState]);
  const stableGetState = useCallback((row: TrackedGridRow<RuleRow>) => gridStateReader.current(row), []);
  const getGridRowKey = useCallback((row: TrackedGridRow<RuleRow>) => row.__GRID_ROW_ID, []);
  const [selectedId, setSelectedId] = useState('');
  const [scopeKey, setScopeKey] = useState('');
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<DocumentNumberIssue[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const keyword = '';
  const selected = rows.find(row => row.__GRID_ROW_ID === selectedId) ?? null;
  const canCreate = hasAction('ADMIN', 'DOC_NUMBER_MGMT', COMMON_ACTIONS.CREATE);
  const canUpdate = hasAction('ADMIN', 'DOC_NUMBER_MGMT', COMMON_ACTIONS.UPDATE);
  const writableRows = rows.filter(row => getState(row) !== 'DELETED');
  const columns = useMemo<DataTableColumn<RuleRow>[]>(() => baseColumns.map(column => column.key !== 'RULE_KEY' ? column : ({
    ...column,
    render: row => stableGetState(row as TrackedGridRow<RuleRow>) === 'INSERTED'
      ? <input
        className="basekit-grid-input document-number-rule-key-input"
        aria-label="RULE KEY"
        maxLength={80}
        autoComplete="off"
        defaultValue={row.RULE_KEY}
        disabled={!canCreate}
        onClick={event => event.stopPropagation()}
        onBlur={event => {
          const trackedRow = row as TrackedGridRow<RuleRow>;
          const value = event.currentTarget.value;
          if (value !== row.RULE_KEY) {
            update(trackedRow.__GRID_ROW_ID, current => ({ ...current, RULE_KEY: value }));
            setPreview('');
            setMessage('');
          }
        }}
      />
      : row.RULE_KEY,
  })), [canCreate, stableGetState, update]);

  const load = useCallback(async (preserveId?: string) => {
    setLoading(true);
    try {
      const result = await documentNumberApi.list(keyword);
      setLoadFailed(false);
      replace(result.map(toRuleRow));
      const preferred = result.map(toRuleRow).find(row => ruleKey(row) === preserveId) ?? result[0] ?? null;
      // replaceGridRows assigns the API key as the tracked row id.
      const id = preferred ? ruleKey(preferred) : '';
      setSelectedId(preserveId && result.some(row => ruleKey(row) === preserveId) ? preserveId : id);
      setMessage(`${result.length}개 RULE을 조회했습니다.`);
    } catch (error) {
      setLoadFailed(true);
      setMessage(error instanceof Error ? error.message : 'RULE 목록 조회에 실패했습니다.');
    } finally { setLoading(false); }
  }, [replace, keyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const editing = useMemo<GridEditing<TrackedGridRow<RuleRow>>>(() => ({
    mode: 'cell',
    keys: Object.keys(fields),
    onChange: (row, key, value) => {
      update(row.__GRID_ROW_ID, current => ({ ...current, [key]: ['SEQUENCE_LENGTH', 'START_VALUE', 'INCREMENT_VALUE'].includes(key) ? Number(value) : value }));
      setPreview('');
    },
    isEditable: (row, key) => {
      if (!canUpdate && stableGetState(row) !== 'INSERTED') return false;
      if (key === 'RULE_KEY') return stableGetState(row) === 'INSERTED';
      return !formatKeys.has(key) || stableGetState(row) === 'INSERTED' || row.CURRENT_VALUE === 0;
    },
  }), [canUpdate, stableGetState, update]);

  const addRule = () => {
    const row = { ...EMPTY_RULE };
    add(row);
    setSelectedId('');
    setMessage('신규 RULE 행을 추가했습니다. 셀을 입력한 뒤 저장하세요.');
  };

  const cancelChanges = () => {
    revert(rows.map(row => row.__GRID_ROW_ID));
    setSelectedId(current => rows.some(row => row.__GRID_ROW_ID === current && getState(row) !== 'INSERTED') ? current : '');
    setPreview('');
    setMessage('미저장 변경사항을 취소했습니다.');
  };

  const saveChanges = async () => {
    const changes = changeSet;
    const changed = [...changes.INSERTED, ...changes.UPDATED];
    for (const row of changed) {
      const errors = validateDocumentNumberRule(toSave(row));
      const error = Object.values(errors)[0];
      if (error) { setMessage(`${row.RULE_KEY || '신규 RULE'}: ${error}`); return; }
    }
    const invalid = findGridValidationIssue(changed, columns, ruleFields);
    if (invalid) { setMessage(gridValidationIssueMessage(invalid)); return; }
    if (!changed.length) return;

    setSaving(true);
    const failedInserts: RuleRow[] = [];
    const failedUpdates: RuleRow[] = [];
    const errors: string[] = [];
    try {
      for (const row of changes.INSERTED) {
        try { await documentNumberApi.create(toSave(row)); }
        catch (error) { failedInserts.push(row); errors.push(error instanceof Error ? error.message : '등록 실패'); }
      }
      for (const row of changes.UPDATED) {
        const current = rows.find(item => ruleKey(item) === ruleKey(row));
        if (!current) continue;
        try { await documentNumberApi.update(toSave(row), current.RULE_VERSION); }
        catch (error) { failedUpdates.push(row); errors.push(error instanceof Error ? error.message : '수정 실패'); }
      }
      const result = await documentNumberApi.list(keyword);
      replace(result.map(toRuleRow));
      // Keep rows whose API call failed editable so the user can correct and retry them.
      for (const row of failedInserts) add(row);
      for (const row of failedUpdates) {
        const tracked = rows.find(item => ruleKey(item) === ruleKey(row));
        if (tracked) update(tracked.__GRID_ROW_ID, current => ({ ...current, ...row }));
      }
      setSelectedId(current => result.some(row => ruleKey(row) === current) ? current : '');
      setMessage(errors.length ? `일부 변경을 저장하지 못했습니다. ${errors[0]}` : `${changed.length}개 RULE 변경사항을 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 후 목록을 다시 불러오지 못했습니다.');
    } finally { setSaving(false); }
  };

  const showPreview = async () => {
    if (!selected) { setMessage('미리볼 RULE 행을 선택하세요.'); return; }
    if (getState(selected) === 'UPDATED') { setMessage('저장되지 않은 변경사항이 있습니다. 먼저 저장한 뒤 미리보기하세요.'); return; }
    const draft = toSave(selected);
    const errors = validateDocumentNumberRule(draft);
    const error = Object.values(errors)[0];
    if (error) { setMessage(error); return; }
    try {
      const isNew = getState(selected) === 'INSERTED';
      const result = await documentNumberApi.preview(draft.RULE_KEY, isNew ? undefined : selected.RULE_VERSION, scopeKey, isNew ? draft : undefined);
      setPreview(result.DOCUMENT_NUMBER);
      setMessage('미리보기는 읽기 전용이며 번호를 소비하지 않습니다. 실제 발급 결과와 다를 수 있습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '미리보기 요청에 실패했습니다.'); }
  };

  const showHistory = async () => {
    if (!selected || getState(selected) === 'INSERTED') return;
    try {
      setHistory(await documentNumberApi.history(selected.RULE_KEY, selected.RULE_VERSION));
      setHistoryOpen(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : '발급 이력 조회에 실패했습니다.'); }
  };

  const toolbarActions: GridToolbarAction<TrackedGridRow<RuleRow>>[] = [
    { actionCode: COMMON_ACTIONS.SEARCH, label: '목록 조회', disabled: loading || saving, onClick: () => { void load(selectedId || undefined); } },
    ...(canCreate ? [{ actionCode: COMMON_ACTIONS.CREATE, label: '신규 행', onClick: addRule }] : []),
    ...(canUpdate ? [{ actionCode: COMMON_ACTIONS.SAVE, label: '저장', tone: 'primary' as const, disabled: !dirty || saving, onClick: saveChanges }] : []),
    ...(canUpdate ? [{ actionCode: COMMON_ACTIONS.REVERT_CHANGES, label: '취소', disabled: !dirty || saving, onClick: cancelChanges }] : []),
    { actionCode: COMMON_ACTIONS.SEARCH, label: '번호 미리보기', disabled: !selected || saving, onClick: showPreview },
    { actionCode: COMMON_ACTIONS.SEARCH, label: '발급 이력 조회', disabled: !selected || getState(selected) === 'INSERTED' || saving, onClick: showHistory },
  ];

  const issueColumns = useMemo<DataTableColumn<DocumentNumberIssue>[]>(() => [
    { key: 'DOCUMENT_NUMBER', header: '발급 번호', width: 210, render: row => row.DOCUMENT_NUMBER },
    { key: 'ISSUE_STATUS', header: '발급 상태', width: 120, render: row => row.ISSUE_STATUS },
    { key: 'REG_DT', header: '발급 일시', width: 190, render: row => row.REG_DT },
    { key: 'SCOPE_KEY', header: '적용 범위', width: 160, render: row => row.SCOPE_KEY },
    { key: 'BUSINESS_REF', header: '업무 참조', width: 200, render: row => row.BUSINESS_REF ?? '-' },
  ], []);

  const gridRows = writableRows;
  return <div className="page document-number-management">
    <PageHeader breadcrumbs={['시스템관리', '채번관리']} description="업무 최초 저장에서 사용할 공통 채번 규칙을 관리합니다. 번호는 업무 저장 Backend에서만 발급됩니다." />
    <section className="document-number-grid-panel">
      <BaseKitDataGrid
        programKey="DOC_NUMBER_MGMT" roleCode="ADMIN" title="채번 규칙" columns={columns} rows={gridRows}
        getRowKey={getGridRowKey} currentRowKey={selectedId} getRowState={stableGetState}
        editing={editing} loading={loading || saving} onRowClick={row => setSelectedId(row.__GRID_ROW_ID)}
        selectable={false} toolbarActions={toolbarActions} toolbarLayout="two-row"
        toolbarOptions={<div className="document-number-grid-options">
          <FormField label="미리보기 적용 범위"><input value={scopeKey} placeholder="전체 RULE은 비워둡니다" onChange={event => setScopeKey(event.target.value)} /></FormField>
          {preview && <output aria-label="미리보기 번호">미리보기: {preview}</output>}
          {selected && <span>선택: {selected.RULE_KEY || '신규 RULE'}{selected.RULE_VERSION ? ` · v${selected.RULE_VERSION}` : ''}</span>}
        </div>}
        emptyMessage={loadFailed ? 'RULE 목록을 조회하지 못했습니다. 목록 조회를 다시 실행하세요.' : '등록된 RULE이 없습니다. 신규 행으로 규칙을 추가할 수 있습니다.'}
      />
      <p className="document-number-grid-message" role="status">{message || '미리보기는 번호를 소비하지 않습니다.'}</p>
    </section>

    <FormModal open={historyOpen} title={`${selected?.RULE_KEY ?? ''} 발급 이력`} onClose={() => setHistoryOpen(false)}>
      <BaseKitDataGrid programKey="DOC_NUMBER_MGMT" roleCode="ADMIN" title="발급 이력" columns={issueColumns} rows={history}
        getRowKey={row => row.ISSUE_ID} selectable={false} enabledActions={[]} emptyMessage="발급 이력이 없습니다." />
    </FormModal>
  </div>;
}
