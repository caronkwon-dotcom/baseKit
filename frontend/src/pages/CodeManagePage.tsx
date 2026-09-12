import { useCallback, useEffect, useState } from 'react';
import { FormModal, PageHeader, ProgramDataGrid, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import { COMMON_ACTIONS } from '../constants/actionCodes';
import { coreCodeApi } from '../services/coreCodeApi';
import type { Code, CodeGroup, UseYn } from '../types';

interface CodeSearchCondition { groupKeyword: string; codeName: string; useYn: '' | UseYn }
type GroupForm = Pick<CodeGroup, 'CODE_GROUP_ID' | 'CODE_GROUP_NAME' | 'DESCRIPTION' | 'USE_YN'>;
type CodeForm = Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN'>;
type Editor =
  | { kind: 'group'; mode: 'create' | 'update'; value: GroupForm }
  | { kind: 'code'; mode: 'create' | 'update'; value: CodeForm };
type DeleteTarget = { kind: 'group' | 'code'; id: string; name: string };

const PROGRAM_KEY = 'COMMON_CODE_MGMT' as const;
const ROLE_CODE = 'ADMIN';
const initialCondition: CodeSearchCondition = { groupKeyword: '', codeName: '', useYn: '' };
const emptyGroupForm: GroupForm = { CODE_GROUP_ID: '', CODE_GROUP_NAME: '', DESCRIPTION: '', USE_YN: 'Y' };
const searchFields: SearchFieldConfig<CodeSearchCondition>[] = [
  { key: 'groupKeyword', label: '코드그룹', placeholder: '그룹 ID/그룹명' },
  { key: 'codeName', label: '코드명', placeholder: '코드명' },
  { key: 'useYn', label: '사용 여부', controlType: 'select', options: [
    { value: '', label: '전체' }, { value: 'Y', label: '사용' }, { value: 'N', label: '미사용' },
  ] },
];
const groupColumns: DataTableColumn<CodeGroup>[] = [
  { key: 'CODE_GROUP_ID', header: '그룹 ID', render: (row) => row.CODE_GROUP_ID },
  { key: 'CODE_GROUP_NAME', header: '그룹명', render: (row) => row.CODE_GROUP_NAME },
  { key: 'DESCRIPTION', header: '설명', render: (row) => row.DESCRIPTION || '-' },
  { key: 'USE_YN', header: '사용 여부', render: (row) => row.USE_YN === 'Y' ? '사용' : '미사용' },
];
const codeColumns: DataTableColumn<Code>[] = [
  { key: 'CODE_ID', header: '코드 ID', render: (row) => row.CODE_ID },
  { key: 'CODE', header: '코드', render: (row) => row.CODE },
  { key: 'CODE_NAME', header: '코드명', render: (row) => row.CODE_NAME },
  { key: 'SORT_ORDER', header: '정렬순서', render: (row) => row.SORT_ORDER },
  { key: 'USE_YN', header: '사용 여부', render: (row) => row.USE_YN === 'Y' ? '사용' : '미사용' },
  { key: 'MOD_BY', header: '최종수정자', render: (row) => row.MOD_BY },
  { key: 'MOD_DT', header: '최종수정일시', render: (row) => row.MOD_DT },
];

const normalizeGroup = (value: GroupForm): GroupForm => ({
  ...value, CODE_GROUP_ID: value.CODE_GROUP_ID.trim(), CODE_GROUP_NAME: value.CODE_GROUP_NAME.trim(), DESCRIPTION: value.DESCRIPTION.trim(),
});
const normalizeCode = (value: CodeForm): CodeForm => ({
  ...value, CODE_ID: value.CODE_ID.trim(), CODE_GROUP_ID: value.CODE_GROUP_ID.trim(),
  CODE: value.CODE.trim(), CODE_NAME: value.CODE_NAME.trim(), SORT_ORDER: Number(value.SORT_ORDER),
});

export default function CodeManagePage() {
  const [condition, setCondition] = useState(initialCondition);
  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [selectedCodeKeys, setSelectedCodeKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const loadCodes = useCallback(async (groupId: string, searchCondition: CodeSearchCondition) => {
    setSelectedCodeKeys(new Set());
    if (!groupId) { setCodes([]); return; }
    setCodes(await coreCodeApi.findCodes(groupId, searchCondition.codeName, searchCondition.useYn));
  }, []);

  const loadGroups = useCallback(async (searchCondition: CodeSearchCondition, preferredGroupId = '') => {
    setLoading(true);
    try {
      const nextGroups = await coreCodeApi.findGroups(searchCondition.groupKeyword, searchCondition.useYn);
      setGroups(nextGroups);
      const nextGroupId = nextGroups.some((group) => group.CODE_GROUP_ID === preferredGroupId)
        ? preferredGroupId : nextGroups[0]?.CODE_GROUP_ID ?? '';
      setSelectedGroupId(nextGroupId);
      setSelectedGroupKeys(nextGroupId ? new Set([nextGroupId]) : new Set());
      await loadCodes(nextGroupId, searchCondition);
    } catch (error) {
      setGroups([]); setCodes([]); setSelectedGroupId(''); setSelectedGroupKeys(new Set());
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '공통코드를 조회하지 못했습니다.' });
    } finally { setLoading(false); }
  }, [loadCodes]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadGroups(initialCondition), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadGroups]);

  const selectGroup = (group: CodeGroup) => {
    setSelectedGroupId(group.CODE_GROUP_ID);
    setSelectedGroupKeys(new Set([group.CODE_GROUP_ID]));
    setMessage(null);
    void loadCodes(group.CODE_GROUP_ID, condition).catch((error: unknown) => {
      setCodes([]);
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '공통코드를 조회하지 못했습니다.' });
    });
  };

  const requireOne = <T,>(rows: T[], targetName: string): T | null => {
    if (rows.length === 1) return rows[0];
    setMessage({ tone: 'error', text: `${targetName}을(를) 한 건 선택해 주세요.` });
    return null;
  };

  const saveEditor = async () => {
    if (!editor) return;
    setMessage(null); setSubmitting(true);
    try {
      if (editor.kind === 'group') {
        const value = normalizeGroup(editor.value);
        if (!value.CODE_GROUP_ID || !value.CODE_GROUP_NAME) throw new Error('코드그룹 ID와 그룹명은 필수입니다.');
        if (editor.mode === 'create') await coreCodeApi.createGroup(value); else await coreCodeApi.updateGroup(value);
        setEditor(null);
        await loadGroups(condition, value.CODE_GROUP_ID);
        setMessage({ tone: 'success', text: `코드그룹이 ${editor.mode === 'create' ? '등록' : '수정'}되었습니다.` });
      } else {
        const value = normalizeCode(editor.value);
        if (!value.CODE_ID || !value.CODE || !value.CODE_NAME) throw new Error('코드 ID, 코드, 코드명은 필수입니다.');
        if (!Number.isInteger(value.SORT_ORDER) || value.SORT_ORDER < 0) throw new Error('정렬순서는 0 이상의 정수로 입력해 주세요.');
        if (editor.mode === 'create') await coreCodeApi.createCode(value); else await coreCodeApi.updateCode(value);
        setEditor(null);
        await loadCodes(value.CODE_GROUP_ID, condition);
        setMessage({ tone: 'success', text: `공통코드가 ${editor.mode === 'create' ? '등록' : '수정'}되었습니다.` });
      }
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '저장하지 못했습니다.' });
    } finally { setSubmitting(false); }
  };

  const deleteSelected = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.kind === 'group') { await coreCodeApi.deleteGroup(deleteTarget.id); await loadGroups(condition); }
      else { await coreCodeApi.deleteCode(deleteTarget.id); await loadCodes(selectedGroupId, condition); }
      setMessage({ tone: 'success', text: `${deleteTarget.name} 항목이 삭제되었습니다.` });
      setDeleteTarget(null);
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '삭제하지 못했습니다.' });
    } finally { setSubmitting(false); }
  };

  return (
    <section className="page code-manage-page">
      <PageHeader breadcrumbs={['시스템관리', '공통코드관리']} description="코드그룹과 공통코드를 등록하고 관리합니다." />
      <SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initialCondition}
        onValueChange={setCondition} onSearch={(next) => void loadGroups(next, selectedGroupId)} onReset={(next) => void loadGroups(next)} />
      {message ? <div className={`page-message ${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</div> : null}

      <div className="master-detail-grid">
        <ProgramDataGrid programKey={PROGRAM_KEY} roleCode={ROLE_CODE} title="코드그룹 목록"
          columns={groupColumns} rows={loading ? [] : groups} getRowKey={(row) => row.CODE_GROUP_ID}
          emptyMessage={loading ? '코드그룹을 조회하고 있습니다.' : '조회된 코드그룹이 없습니다.'}
          selectedRowKeys={selectedGroupKeys}
          onSelectedRowKeysChange={(keys) => {
            const group = groups.find((item) => item.CODE_GROUP_ID === [...keys].at(-1));
            if (group) selectGroup(group); else { setSelectedGroupKeys(new Set()); setSelectedGroupId(''); setCodes([]); }
          }}
          onRowClick={selectGroup} getRowClassName={(row) => row.CODE_GROUP_ID === selectedGroupId ? 'active-master-row' : ''}
          actionHandlers={{
            [COMMON_ACTIONS.CREATE]: () => setEditor({ kind: 'group', mode: 'create', value: { ...emptyGroupForm } }),
            [COMMON_ACTIONS.UPDATE]: ({ selectedRows }) => { const row = requireOne(selectedRows, '수정할 코드그룹'); if (row) setEditor({ kind: 'group', mode: 'update', value: { ...row } }); },
            [COMMON_ACTIONS.DELETE]: ({ selectedRows }) => { const row = requireOne(selectedRows, '삭제할 코드그룹'); if (row) setDeleteTarget({ kind: 'group', id: row.CODE_GROUP_ID, name: row.CODE_GROUP_NAME }); },
          }} />

        <ProgramDataGrid programKey={PROGRAM_KEY} roleCode={ROLE_CODE}
          title={selectedGroupId ? `${selectedGroupId} 공통코드 목록` : '공통코드 목록'}
          columns={codeColumns} rows={loading ? [] : codes} getRowKey={(row) => row.CODE_ID}
          emptyMessage={selectedGroupId ? '조회된 공통코드가 없습니다.' : '코드그룹을 선택해 주세요.'}
          selectedRowKeys={selectedCodeKeys} onSelectedRowKeysChange={setSelectedCodeKeys}
          actionHandlers={{
            [COMMON_ACTIONS.CREATE]: () => {
              if (!selectedGroupId) { setMessage({ tone: 'error', text: '코드를 등록할 코드그룹을 먼저 선택해 주세요.' }); return; }
              setEditor({ kind: 'code', mode: 'create', value: { CODE_ID: '', CODE_GROUP_ID: selectedGroupId, CODE: '', CODE_NAME: '', SORT_ORDER: 0, USE_YN: 'Y' } });
            },
            [COMMON_ACTIONS.UPDATE]: ({ selectedRows }) => { const row = requireOne(selectedRows, '수정할 공통코드'); if (row) setEditor({ kind: 'code', mode: 'update', value: { ...row } }); },
            [COMMON_ACTIONS.DELETE]: ({ selectedRows }) => { const row = requireOne(selectedRows, '삭제할 공통코드'); if (row) setDeleteTarget({ kind: 'code', id: row.CODE_ID, name: row.CODE_NAME }); },
          }} />
      </div>

      <FormModal open={editor !== null}
        title={editor ? `${editor.kind === 'group' ? '코드그룹' : '공통코드'} ${editor.mode === 'create' ? '신규 등록' : '수정'}` : ''}
        submitting={submitting} onClose={() => setEditor(null)} onSubmit={() => void saveEditor()}>
        {editor?.kind === 'group' ? <GroupEditor editor={editor} setEditor={setEditor} />
          : editor?.kind === 'code' ? <CodeEditor editor={editor} setEditor={setEditor} /> : null}
      </FormModal>
      <FormModal open={deleteTarget !== null} title="삭제 확인" submitLabel="삭제" submitTone="danger"
        submitting={submitting} onClose={() => setDeleteTarget(null)} onSubmit={() => void deleteSelected()}>
        <p><strong>{deleteTarget?.name}</strong> 항목을 삭제하시겠습니까? 삭제된 항목은 목록에서 제외됩니다.</p>
      </FormModal>
    </section>
  );
}

function GroupEditor({ editor, setEditor }: { editor: Extract<Editor, { kind: 'group' }>; setEditor: (value: Editor) => void }) {
  const update = (patch: Partial<GroupForm>) => setEditor({ ...editor, value: { ...editor.value, ...patch } });
  return <div className="standard-form-grid">
    <label><span>코드그룹 ID <em>*</em></span><input autoFocus value={editor.value.CODE_GROUP_ID} disabled={editor.mode === 'update'} maxLength={50} onChange={(e) => update({ CODE_GROUP_ID: e.target.value })} /></label>
    <label><span>그룹명 <em>*</em></span><input value={editor.value.CODE_GROUP_NAME} maxLength={100} onChange={(e) => update({ CODE_GROUP_NAME: e.target.value })} /></label>
    <label className="form-full-row"><span>설명</span><textarea value={editor.value.DESCRIPTION} maxLength={500} onChange={(e) => update({ DESCRIPTION: e.target.value })} /></label>
    <label><span>사용 여부</span><select value={editor.value.USE_YN} onChange={(e) => update({ USE_YN: e.target.value as UseYn })}><option value="Y">사용</option><option value="N">미사용</option></select></label>
  </div>;
}

function CodeEditor({ editor, setEditor }: { editor: Extract<Editor, { kind: 'code' }>; setEditor: (value: Editor) => void }) {
  const update = (patch: Partial<CodeForm>) => setEditor({ ...editor, value: { ...editor.value, ...patch } });
  return <div className="standard-form-grid">
    <label><span>코드그룹 ID</span><input value={editor.value.CODE_GROUP_ID} disabled /></label>
    <label><span>코드 ID <em>*</em></span><input autoFocus value={editor.value.CODE_ID} disabled={editor.mode === 'update'} maxLength={50} onChange={(e) => update({ CODE_ID: e.target.value })} /></label>
    <label><span>코드 <em>*</em></span><input value={editor.value.CODE} maxLength={50} onChange={(e) => update({ CODE: e.target.value })} /></label>
    <label><span>코드명 <em>*</em></span><input value={editor.value.CODE_NAME} maxLength={100} onChange={(e) => update({ CODE_NAME: e.target.value })} /></label>
    <label><span>정렬순서 <em>*</em></span><input type="number" min="0" step="1" value={editor.value.SORT_ORDER} onChange={(e) => update({ SORT_ORDER: Number(e.target.value) })} /></label>
    <label><span>사용 여부</span><select value={editor.value.USE_YN} onChange={(e) => update({ USE_YN: e.target.value as UseYn })}><option value="Y">사용</option><option value="N">미사용</option></select></label>
  </div>;
}
