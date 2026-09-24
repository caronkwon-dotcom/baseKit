import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveCodeAttributeOptions, toFieldDefinitions } from '../adapters/codeAttributeFieldAdapter';
import { codeAttributeGridFields, codeGridFields, codeGroupGridFields } from '../adapters/codeGridFieldDefinitions';
import { BaseKitMessage, MasterDetailMultiGrid, PageHeader, SearchPanel, type BaseKitMessageType, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import BaseKitDataGrid from '../components/grid/BaseKitDataGrid';
import { findGridValidationIssue, gridValidationIssueMessage, userGridErrorMessage } from '../components/grid/gridFieldValidation';
import { useGridRowState, type TrackedGridRow } from '../components/grid/gridRowState';
import type { FieldOption } from '../components/metadata';
import { coreCodeApi } from '../services/coreCodeApi';
import type { Code, CodeAttributeDefinition, CodeGroup, UseYn } from '../types';

interface Condition { groupKeyword: string; codeName: string; useYn: '' | UseYn }
type CodeMessage = { type: BaseKitMessageType; text: string };

const PROGRAM_KEY = 'COMMON_CODE_MGMT' as const;
const ROLE = 'ADMIN';
const initial: Condition = { groupKeyword: '', codeName: '', useYn: '' };
const managed = { USE_YN: 'Y' as UseYn, DEL_YN: 'N' as const, REG_DT: '', REG_BY: '', MOD_DT: '', MOD_BY: '' };
const groupKey = (row: CodeGroup) => row.CODE_GROUP_ID;
const codeKey = (row: Code) => row.CODE_ID;
const attributeKey = (row: CodeAttributeDefinition) => row.ATTRIBUTE_DEF_ID;
const searchFields: SearchFieldConfig<Condition>[] = [
  { key: 'groupKeyword', label: '코드그룹', placeholder: '그룹 ID/그룹명' },
  { key: 'codeName', label: '코드명' },
  { key: 'useYn', label: '사용 여부', controlType: 'select', options: [{ value: '', label: '전체' }, { value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] },
];
const groupColumns: DataTableColumn<CodeGroup>[] = [
  { key: 'CODE_GROUP_ID', header: '그룹 ID', width: 140, editPolicy: 'insert-only', fieldDefinition: codeGroupGridFields.CODE_GROUP_ID, render: row => row.CODE_GROUP_ID },
  { key: 'CODE_GROUP_NAME', header: '그룹명', flex: 1, fieldDefinition: codeGroupGridFields.CODE_GROUP_NAME, render: row => row.CODE_GROUP_NAME },
  { key: 'DESCRIPTION', header: '설명', flex: 1, fieldDefinition: codeGroupGridFields.DESCRIPTION, render: row => row.DESCRIPTION },
  { key: 'USE_YN', header: '사용', width: 52, fieldDefinition: codeGroupGridFields.USE_YN, render: row => row.USE_YN },
];
const codeColumns: DataTableColumn<Code>[] = [
  { key: 'CODE_ID', header: '코드 ID', width: 130, editPolicy: 'insert-only', fieldDefinition: codeGridFields.CODE_ID, render: row => row.CODE_ID },
  { key: 'CODE', header: '코드', width: 100, editPolicy: 'insert-only', fieldDefinition: codeGridFields.CODE, render: row => row.CODE },
  { key: 'CODE_NAME', header: '코드명', flex: 1, fieldDefinition: codeGridFields.CODE_NAME, render: row => row.CODE_NAME },
  { key: 'SORT_ORDER', header: '정렬', width: 55, fieldDefinition: codeGridFields.SORT_ORDER, render: row => row.SORT_ORDER },
  { key: 'USE_YN', header: '사용', width: 52, fieldDefinition: codeGridFields.USE_YN, render: row => row.USE_YN },
];
const attributeColumns: DataTableColumn<CodeAttributeDefinition>[] = [
  { key: 'ATTRIBUTE_CODE', header: '속성코드', width: 120, editPolicy: 'insert-only', fieldDefinition: codeAttributeGridFields.ATTRIBUTE_CODE, render: row => row.ATTRIBUTE_CODE },
  { key: 'ATTRIBUTE_NAME', header: '속성명', flex: 1, fieldDefinition: codeAttributeGridFields.ATTRIBUTE_NAME, render: row => row.ATTRIBUTE_NAME },
  { key: 'DATA_TYPE', header: '데이터', width: 84, fieldDefinition: codeAttributeGridFields.DATA_TYPE, render: row => row.DATA_TYPE },
  { key: 'CONTROL_TYPE', header: '컨트롤', width: 96, fieldDefinition: codeAttributeGridFields.CONTROL_TYPE, render: row => row.CONTROL_TYPE },
  { key: 'DISPLAY_TYPE', header: '표시', width: 82, fieldDefinition: codeAttributeGridFields.DISPLAY_TYPE, render: row => row.DISPLAY_TYPE },
  { key: 'REQUIRED_YN', header: '필수', width: 52, fieldDefinition: codeAttributeGridFields.REQUIRED_YN, render: row => row.REQUIRED_YN },
  { key: 'OPTION_SOURCE', header: 'Option Source', flex: 1, fieldDefinition: codeAttributeGridFields.OPTION_SOURCE, render: row => row.OPTION_SOURCE ?? '' },
  { key: 'SORT_ORDER', header: '정렬', width: 55, fieldDefinition: codeAttributeGridFields.SORT_ORDER, render: row => row.SORT_ORDER },
  { key: 'USE_YN', header: '사용', width: 52, fieldDefinition: codeAttributeGridFields.USE_YN, render: row => row.USE_YN },
];
const groupFieldDefinitions = Object.values(codeGroupGridFields);
const attributeFieldDefinitions = Object.values(codeAttributeGridFields);
const codeFieldDefinitions = Object.values(codeGridFields);
const clean = (value: unknown) => String(value ?? '').trim();
const applyGridValue = <T,>(row: T, columns: DataTableColumn<T>[], key: string, value: string): T => {
  const field = columns.find((column) => column.key === key)?.fieldDefinition;
  return { ...row, [key]: field?.dataType === 'NUMBER' && value !== '' ? Number(value) : value };
};

export default function CodeManagePage() {
  const [condition, setCondition] = useState(initial);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupSelected, setGroupSelected] = useState(new Set<string>());
  const [attributeSelected, setAttributeSelected] = useState(new Set<string>());
  const [codeSelected, setCodeSelected] = useState(new Set<string>());
  const [options, setOptions] = useState(new Map<string, FieldOption[]>());
  const [message, setMessage] = useState<CodeMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const initialLoad = useRef(false);
  const groups = useGridRowState(groupKey);
  const attributes = useGridRowState(attributeKey);
  const codes = useGridRowState(codeKey);
  const fields = useMemo(() => toFieldDefinitions(attributes.rows, options), [attributes.rows, options]);
  const notify = (text: string, type: BaseKitMessageType = 'warn') => setMessage({ type, text });

  const loadDetail = useCallback(async (id: string, search: Condition) => {
    if (!id) { attributes.replace([]); codes.replace([]); return; }
    const [codeRows, definitions, values] = await Promise.all([
      coreCodeApi.findCodes(id, search.codeName, search.useYn),
      coreCodeApi.findAttributeDefinitions(id),
      coreCodeApi.findAttributeValues(id),
    ]);
    const valuesByCode = new Map<string, Record<string, string>>();
    values.forEach(value => valuesByCode.set(value.CODE_ID, { ...(valuesByCode.get(value.CODE_ID) ?? {}), [value.ATTRIBUTE_CODE]: value.ATTRIBUTE_VALUE }));
    attributes.replace(definitions);
    codes.replace(codeRows.map(row => ({ ...row, ATTRIBUTE_VALUES: valuesByCode.get(row.CODE_ID) ?? {} })));
    setOptions(await resolveCodeAttributeOptions(definitions));
  }, [attributes, codes]);

  const loadGroups = useCallback(async (search: Condition, preferred = '', skipDirtyConfirm = false) => {
    if (!skipDirtyConfirm && (groups.dirty || attributes.dirty || codes.dirty) && !window.confirm('미저장 변경사항이 사라집니다. 계속하시겠습니까?')) return;
    try {
      const rows = await coreCodeApi.findGroups(search.groupKeyword, search.useYn);
      groups.replace(rows);
      const id = rows.some(row => row.CODE_GROUP_ID === preferred) ? preferred : rows[0]?.CODE_GROUP_ID ?? '';
      setSelectedGroupId(id);
      setGroupSelected(new Set());
      await loadDetail(id, search);
      notify(`조회가 완료되었습니다. (총 ${rows.length}건)`, 'info');
    } catch (error) {
      notify(error instanceof Error ? error.message : '조회하지 못했습니다.', 'error');
    }
  }, [attributes, codes, groups, loadDetail]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!initialLoad.current) { initialLoad.current = true; void loadGroups(initial); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGroups]);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!groups.dirty && !attributes.dirty && !codes.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [attributes.dirty, codes.dirty, groups.dirty]);

  const rowClass = <T,>(state: (row: TrackedGridRow<T>) => string) => (row: TrackedGridRow<T>) => {
    const rowState = state(row);
    return rowState === 'INSERTED' ? 'grid-inserted-row' : rowState === 'UPDATED' ? 'grid-updated-row' : rowState === 'DELETED' ? 'grid-deleted-row' : '';
  };
  const selectGroup = (row: TrackedGridRow<CodeGroup>) => {
    if (!row.CODE_GROUP_ID || row.CODE_GROUP_ID === selectedGroupId) return;
    if ((attributes.dirty || codes.dirty) && !window.confirm('미저장 변경사항이 사라집니다. 계속하시겠습니까?')) return;
    setSelectedGroupId(row.CODE_GROUP_ID);
    void loadDetail(row.CODE_GROUP_ID, condition);
  };

  const saveGroups = async () => {
    if (attributes.dirty || codes.dirty) return notify('상세 Grid 변경사항을 먼저 저장해 주세요.');
    const invalid = findGridValidationIssue([...groups.changeSet.INSERTED, ...groups.changeSet.UPDATED], groupColumns);
    if (invalid) return notify(gridValidationIssueMessage(invalid));
    setSaving(true);
    try {
      const value = (row: CodeGroup) => ({ CODE_GROUP_ID: clean(row.CODE_GROUP_ID), CODE_GROUP_NAME: clean(row.CODE_GROUP_NAME), DESCRIPTION: clean(row.DESCRIPTION), USE_YN: row.USE_YN });
      await coreCodeApi.saveGroupBatch({ INSERTED: groups.changeSet.INSERTED.map(value), UPDATED: groups.changeSet.UPDATED.map(value), DELETED: groups.changeSet.DELETED });
      await loadGroups(condition, selectedGroupId, true);
      notify('코드그룹을 저장했습니다.', 'info');
    } catch (error) {
      notify(userGridErrorMessage(error, groupFieldDefinitions, '저장하지 못했습니다.'), 'error');
    } finally { setSaving(false); }
  };

  const saveAttributes = async () => {
    if (!selectedGroupId || codes.dirty) return notify('공통코드 변경사항을 먼저 저장해 주세요.');
    const invalid = findGridValidationIssue([...attributes.changeSet.INSERTED, ...attributes.changeSet.UPDATED], attributeColumns);
    if (invalid) return notify(gridValidationIssueMessage(invalid));
    setSaving(true);
    try {
      const value = (row: CodeAttributeDefinition) => ({ ATTRIBUTE_CODE: clean(row.ATTRIBUTE_CODE).toUpperCase(), ATTRIBUTE_NAME: clean(row.ATTRIBUTE_NAME), DATA_TYPE: row.DATA_TYPE, CONTROL_TYPE: row.CONTROL_TYPE, DISPLAY_TYPE: row.DISPLAY_TYPE, REQUIRED_YN: row.REQUIRED_YN, DEFAULT_VALUE: row.DEFAULT_VALUE, OPTION_SOURCE: row.OPTION_SOURCE, SORT_ORDER: Number(row.SORT_ORDER), USE_YN: row.USE_YN });
      await coreCodeApi.saveAttributeBatch(selectedGroupId, { INSERTED: attributes.changeSet.INSERTED.map(value), UPDATED: attributes.changeSet.UPDATED.map(row => ({ ATTRIBUTE_DEF_ID: row.ATTRIBUTE_DEF_ID, VALUE: value(row) })), DELETED: attributes.changeSet.DELETED });
      await loadDetail(selectedGroupId, condition);
      notify('속성정의를 저장했습니다.', 'info');
    } catch (error) {
      notify(userGridErrorMessage(error, attributeFieldDefinitions, '저장하지 못했습니다.'), 'error');
    } finally { setSaving(false); }
  };

  const saveCodes = async () => {
    if (!selectedGroupId) return notify('코드그룹을 선택해 주세요.');
    const invalid = findGridValidationIssue([...codes.changeSet.INSERTED, ...codes.changeSet.UPDATED], codeColumns, fields, (row, field) => row.ATTRIBUTE_VALUES?.[field.key]);
    if (invalid) return notify(gridValidationIssueMessage(invalid));
    setSaving(true);
    try {
      const value = (row: Code) => ({ CODE_ID: clean(row.CODE_ID), CODE_GROUP_ID: selectedGroupId, CODE: clean(row.CODE), CODE_NAME: clean(row.CODE_NAME), SORT_ORDER: Number(row.SORT_ORDER), USE_YN: row.USE_YN, ATTRIBUTE_VALUES: row.ATTRIBUTE_VALUES ?? {} });
      await coreCodeApi.saveCodeBatch(selectedGroupId, { INSERTED: codes.changeSet.INSERTED.map(value), UPDATED: codes.changeSet.UPDATED.map(value), DELETED: codes.changeSet.DELETED });
      await loadDetail(selectedGroupId, condition);
      notify('공통코드를 저장했습니다.', 'info');
    } catch (error) {
      notify(userGridErrorMessage(error, [...codeFieldDefinitions, ...fields], '저장하지 못했습니다.'), 'error');
    } finally { setSaving(false); }
  };

  const toolbar = (add: () => void, remove: () => void, revert: () => void, save: () => void, selected: Set<string>, canRevert: boolean, dirty: boolean) => [
    { actionCode: 'ADD_ROW', label: '행추가', onClick: add },
    { actionCode: 'REMOVE_ROW', label: '행삭제', tone: 'danger' as const, disabled: !selected.size, onClick: remove },
    { actionCode: 'REVERT_CHANGES', label: '변경취소', disabled: !canRevert, onClick: revert },
    { actionCode: 'SAVE', label: '저장', tone: 'primary' as const, disabled: !dirty || saving, onClick: save },
  ];

  return <section className="page code-manage-page multi-grid-page">
    <PageHeader breadcrumbs={['시스템관리', '공통코드관리']} description="코드그룹, 공통코드와 그룹별 업무 속성을 Inline Batch 방식으로 관리합니다." />
    <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initial} onValueChange={setCondition} onSearch={value => void loadGroups(value, selectedGroupId)} onReset={value => void loadGroups(value)} />
    <MasterDetailMultiGrid
      message={message ? <BaseKitMessage type={message.type} message={message.text} /> : null}
      master={<BaseKitDataGrid programKey={PROGRAM_KEY} roleCode={ROLE} title="코드그룹 목록" columns={groupColumns} rows={groups.rows} getRowKey={row => row.__GRID_ROW_ID} getRowState={groups.getState} currentRowKey={groups.rows.find(row => row.CODE_GROUP_ID === selectedGroupId)?.__GRID_ROW_ID} selectedRowKeys={groupSelected} onSelectedRowKeysChange={setGroupSelected} onRowClick={selectGroup} getRowClassName={rowClass(groups.getState)} editing={{ keys: groupColumns.map(column => column.key), onChange: (row, key, value) => groups.update(row.__GRID_ROW_ID, current => applyGridValue(current, groupColumns, key, value)) }} toolbarActions={toolbar(() => groups.add({ ...managed, CODE_GROUP_ID: '', CODE_GROUP_NAME: '', DESCRIPTION: '' }), () => { groups.remove(groupSelected); setGroupSelected(new Set()); }, () => { groups.revert(groupSelected); setGroupSelected(new Set()); }, () => void saveGroups(), groupSelected, groups.hasChanges(groupSelected), groups.dirty)} />}
      detailTop={<BaseKitDataGrid programKey={PROGRAM_KEY} roleCode={ROLE} title={`${selectedGroupId} 속성정의 목록`} columns={attributeColumns} rows={attributes.rows} getRowKey={row => row.__GRID_ROW_ID} getRowState={attributes.getState} selectedRowKeys={attributeSelected} onSelectedRowKeysChange={setAttributeSelected} getRowClassName={rowClass(attributes.getState)} editing={{ keys: attributeColumns.map(column => column.key), onChange: (row, key, value) => attributes.update(row.__GRID_ROW_ID, current => applyGridValue(current, attributeColumns, key, value)) }} toolbarActions={toolbar(() => selectedGroupId ? attributes.add({ ...managed, ATTRIBUTE_DEF_ID: '', CODE_GROUP_ID: selectedGroupId, ATTRIBUTE_CODE: '', ATTRIBUTE_NAME: '', DATA_TYPE: 'STRING', CONTROL_TYPE: 'TEXT', DISPLAY_TYPE: 'TEXT', REQUIRED_YN: 'N', DEFAULT_VALUE: null, OPTION_SOURCE: null, SORT_ORDER: 0 }) : notify('코드그룹을 선택해 주세요.'), () => { attributes.remove(attributeSelected); setAttributeSelected(new Set()); }, () => { attributes.revert(attributeSelected); setAttributeSelected(new Set()); }, () => void saveAttributes(), attributeSelected, attributes.hasChanges(attributeSelected), attributes.dirty)} />}
      detailBottom={<BaseKitDataGrid programKey={PROGRAM_KEY} roleCode={ROLE} title={`${selectedGroupId} 공통코드 목록`} columns={codeColumns} fields={fields} rows={codes.rows} getRowKey={row => row.__GRID_ROW_ID} getRowState={codes.getState} getFieldValue={(row, field) => row.ATTRIBUTE_VALUES?.[field.key]} selectedRowKeys={codeSelected} onSelectedRowKeysChange={setCodeSelected} getRowClassName={rowClass(codes.getState)} editing={{ keys: [...codeColumns.map(column => column.key), ...fields.map(field => `ATTRIBUTE_${field.key}`)], onChange: (row, key, value) => codes.update(row.__GRID_ROW_ID, current => key.startsWith('ATTRIBUTE_') ? { ...current, ATTRIBUTE_VALUES: { ...current.ATTRIBUTE_VALUES, [key.slice(10)]: value } } : applyGridValue(current, codeColumns, key, value)) }} toolbarActions={toolbar(() => selectedGroupId ? codes.add({ ...managed, CODE_ID: '', CODE_GROUP_ID: selectedGroupId, CODE: '', CODE_NAME: '', SORT_ORDER: 0, ATTRIBUTE_VALUES: Object.fromEntries(fields.map(field => [field.key, field.defaultValue ?? ''])) }) : notify('코드그룹을 선택해 주세요.'), () => { codes.remove(codeSelected); setCodeSelected(new Set()); }, () => { codes.revert(codeSelected); setCodeSelected(new Set()); }, () => void saveCodes(), codeSelected, codes.hasChanges(codeSelected), codes.dirty)} />}
    />
  </section>;
}
