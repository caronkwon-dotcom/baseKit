import { useMemo, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import MetadataAgGrid from '../components/grid/MetadataAgGrid';
import { toFieldDefinitions } from '../adapters/codeAttributeFieldAdapter';
import { coreCodeApi } from '../services/coreCodeApi';
import type { Code, CodeAttributeDefinition, CodeGroup } from '../types';
import type { DataTableColumn } from '../components/common/DataTable';
import '../styles.css';

// Dedicated Vite development entry only. Does not enter the production bundle or call a backend.
const params = new URLSearchParams(location.search);
const count = [0, 20, 500, 2000].includes(Number(params.get('rows'))) && params.has('rows') ? Number(params.get('rows')) : 20;
const audit = { REG_DT: '2026-09-19T09:00:00', REG_BY: 'POC', MOD_DT: '2026-09-19T09:00:00', MOD_BY: 'POC', USE_YN: 'Y' as const, DEL_YN: 'N' as const };
let groups: CodeGroup[] = Array.from({ length: 20 }, (_, i) => ({ ...audit, CODE_GROUP_ID: `POC_${String(i + 1).padStart(2, '0')}`, CODE_GROUP_NAME: i ? `검증 그룹 ${i + 1}` : '사용자 상태', DESCRIPTION: 'AG Grid Community 검증 데이터' }));
let definitions: CodeAttributeDefinition[] = [
  { ATTRIBUTE_CODE: 'COLOR', ATTRIBUTE_NAME: '색상', DATA_TYPE: 'STRING', CONTROL_TYPE: 'COLOR_PICKER', DISPLAY_TYPE: 'COLOR' },
  { ATTRIBUTE_CODE: 'LOGIN_ALLOWED', ATTRIBUTE_NAME: '로그인 허용', DATA_TYPE: 'BOOLEAN', CONTROL_TYPE: 'SWITCH', DISPLAY_TYPE: 'BOOLEAN' },
  { ATTRIBUTE_CODE: 'BADGE_TYPE', ATTRIBUTE_NAME: '배지 유형', DATA_TYPE: 'STRING', CONTROL_TYPE: 'SELECT', DISPLAY_TYPE: 'BADGE' },
].map((value, i) => ({ ...audit, ...value, ATTRIBUTE_DEF_ID: `DEF_${i}`, CODE_GROUP_ID: 'POC_01', REQUIRED_YN: 'N', DEFAULT_VALUE: null, OPTION_SOURCE: i === 2 ? 'CODE_GROUP:BADGES' : null, SORT_ORDER: i } as CodeAttributeDefinition));
function makeRows(size: number): Code[] { return Array.from({ length: size }, (_, i) => ({ ...audit, CODE_ID: `ROW_${i + 1}`, CODE_GROUP_ID: 'POC_01', CODE: `CODE_${String(i + 1).padStart(4, '0')}`, CODE_NAME: `공통코드 ${i + 1}`, SORT_ORDER: i + 1, ATTRIBUTE_VALUES: { COLOR: i % 2 ? '#16a34a' : '#2563eb', LOGIN_ALLOWED: String(i % 2 === 0), BADGE_TYPE: i % 2 ? 'SUCCESS' : 'INFO' } })); }
let rows = makeRows(count);
const delay = async <T,>(value: T): Promise<T> => { await new Promise(resolve => setTimeout(resolve, 350)); return value; };
coreCodeApi.findGroups = async (keyword = '') => delay(groups.filter(group => `${group.CODE_GROUP_ID} ${group.CODE_GROUP_NAME}`.includes(keyword)));
coreCodeApi.findCodes = async (groupId = '', keyword = '') => delay(groupId === 'BADGES' ? [
  { ...makeRows(1)[0], CODE: 'SUCCESS', CODE_NAME: '성공' }, { ...makeRows(1)[0], CODE: 'INFO', CODE_NAME: '안내' },
] : rows.filter(row => row.CODE_NAME.includes(keyword)).map(row => ({ ...row, CODE_GROUP_ID: groupId })));
coreCodeApi.findAttributeDefinitions = async groupId => delay(groupId === 'POC_02' ? definitions.slice(0, 1) : definitions);
coreCodeApi.findAttributeValues = async () => delay(rows.flatMap(row => Object.entries(row.ATTRIBUTE_VALUES ?? {}).map(([key, value]) => ({ CODE_ID: row.CODE_ID, ATTRIBUTE_DEF_ID: key, ATTRIBUTE_CODE: key, ATTRIBUTE_VALUE: value }))));
coreCodeApi.createAttributeDefinition = async (groupId, value) => { const next = { ...audit, ...value, ATTRIBUTE_DEF_ID: `DEF_${definitions.length}`, CODE_GROUP_ID: groupId }; definitions = [...definitions, next]; return next; };
coreCodeApi.updateAttributeDefinition = async (id, value) => { const next = { ...audit, ...value, ATTRIBUTE_DEF_ID: id, CODE_GROUP_ID: 'POC_01' }; definitions = definitions.map(item => item.ATTRIBUTE_DEF_ID === id ? next : item); return next; };
coreCodeApi.deleteAttributeDefinition = async id => { definitions = definitions.filter(item => item.ATTRIBUTE_DEF_ID !== id); };
// All other mutations are deliberately local-only in this fixture.
coreCodeApi.createGroup = async value => { const next = { ...audit, ...value }; groups = [...groups, next]; return next; };
coreCodeApi.updateGroup = async value => { const next = { ...audit, ...value }; groups = groups.map(item => item.CODE_GROUP_ID === value.CODE_GROUP_ID ? next : item); return next; };
coreCodeApi.deleteGroup = async id => { groups = groups.filter(item => item.CODE_GROUP_ID !== id); };
coreCodeApi.createCode = async value => { const next = { ...audit, ...value }; rows = [...rows, next]; return next; };
coreCodeApi.updateCode = async value => { const next = { ...audit, ...value }; rows = rows.map(item => item.CODE_ID === value.CODE_ID ? next : item); return next; };
coreCodeApi.deleteCode = async id => { rows = rows.filter(item => item.CODE_ID !== id); };

const columns: DataTableColumn<Code>[] = [
  { key: 'CODE', header: '코드', width: 140, render: row => row.CODE },
  { key: 'CODE_NAME', header: '코드명 (필수)', minWidth: 150, flex: 1, render: row => row.CODE_NAME },
  { key: 'SORT_ORDER', header: '정렬', width: 90, render: row => row.SORT_ORDER },
];
function EditingPoc() {
  const [saved, setSaved] = useState(() => makeRows(20));
  const [draft, setDraft] = useState(saved);
  const [message, setMessage] = useState('더블클릭으로 편집. 저장은 메모리에만 반영합니다.');
  const [mode, setMode] = useState<'cell' | 'row'>('cell');
  const fields = useMemo(() => toFieldDefinitions(definitions, new Map([['CODE_GROUP:BADGES', [{ value: 'SUCCESS', label: '성공' }, { value: 'INFO', label: '안내' }]]])), []);
  const dirty = new Set(draft.filter(row => JSON.stringify(row) !== JSON.stringify(saved.find(item => item.CODE_ID === row.CODE_ID))).map(row => row.CODE_ID));
  return <section className="page">
    <h1>Inline Editing PoC · 서버 저장 없음</h1>
    <div className="grid-toolbar">
      <button onClick={() => { setDraft(value => [...value, { ...makeRows(1)[0], CODE_ID: `NEW_${Date.now()}`, CODE: 'NEW', CODE_NAME: '', SORT_ORDER: 0 }]); setMessage('신규 행을 추가했습니다. 마지막 행의 코드명을 입력하세요.'); }}>신규</button>
      <button onClick={() => { const invalid = draft.find(row => !row.CODE_NAME.trim() || !Number.isFinite(row.SORT_ORDER)); if (invalid) { setMessage('검증 실패: 코드명 필수 / 정렬은 숫자'); return; } setSaved(structuredClone(draft)); setMessage('메모리 저장 완료'); }}>저장</button>
      <button onClick={() => { setDraft(structuredClone(saved)); setMessage('취소 완료: 저장 시점 복원'); }}>취소</button>
      <button onClick={() => setMode(value => value === 'cell' ? 'row' : 'cell')}>편집 모드: {mode}</button>
      <strong>Dirty {dirty.size}건</strong>
    </div>
    <MetadataAgGrid programKey="COMMON_CODE_MGMT" roleCode="POC_VIEWER" title="편집 검증" selectable={false}
      baseColumns={columns} fields={fields} rows={draft} getRowKey={row => row.CODE_ID} getFieldValue={(row, field) => row.ATTRIBUTE_VALUES?.[field.key]}
      getRowClassName={row => dirty.has(row.CODE_ID) ? 'grid-updated-row' : ''}
      editing={{ mode, keys: ['CODE_NAME', 'SORT_ORDER', ...fields.map(field => `ATTRIBUTE_${field.key}`)], onChange: (row, key, value) => {
        if (key === 'CODE_NAME' && !value.trim()) { setMessage('검증 실패: 코드명은 필수입니다.'); return; }
        if (key === 'SORT_ORDER' && (!value.trim() || !Number.isFinite(Number(value)))) { setMessage('검증 실패: 정렬은 숫자입니다.'); return; }
        const field = fields.find(item => `ATTRIBUTE_${item.key}` === key);
        if (field?.required && !value.trim()) { setMessage(`검증 실패: ${field.label} 필수`); return; }
        setDraft(current => current.map(item => item.CODE_ID !== row.CODE_ID ? item : field ? { ...item, ATTRIBUTE_VALUES: { ...item.ATTRIBUTE_VALUES, [field.key]: value } } : { ...item, [key]: key === 'SORT_ORDER' ? Number(value) : value }));
        setMessage('변경됨: 저장 또는 취소하세요.');
      } }} />
    <p role="status">{message}</p>
  </section>;
}
export default function GridPoc() { return <>
  <style>{`.poc-shell > .app-shell { height: 100%; min-height: 0; }`}</style>
  <div style={{ height: 36, padding: '6px 12px', display: 'flex', gap: 16, background: '#fff4d6' }}>
    <strong>PoC Fixture · DB 연결 없음</strong>
    {[0, 20, 500, 2000].map(size => <a key={size} href={`?rows=${size}#/system/codes`}>{size} rows</a>)}
    <a href="?mode=editing">Inline Editing</a>
  </div>
  <div className="poc-shell" style={{ height: 'calc(100vh - 36px)', overflow: 'auto' }}>{params.get('mode') === 'editing' ? <EditingPoc /> : <HashRouter><AppLayout /></HashRouter>}</div>
</>; }
