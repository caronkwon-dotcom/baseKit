import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '../../../components/common/ActionButton';
import FormField from '../../../components/common/FormField';
import MasterDetailMultiGrid from '../../../components/common/MasterDetailMultiGrid';
import PageHeader from '../../../components/common/PageHeader';
import BaseKitDataGrid from '../../../components/grid/BaseKitDataGrid';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { hasAction } from '../../../repositories/metadataRepository';
import type { DataTableColumn } from '../../../components/common/DataTable';
import { documentNumberApi, type DocumentNumberIssue, type DocumentNumberRule, type RuleSave } from './documentNumberApi';
import { validateDocumentNumberRule } from './documentNumberValidation';
import './documentNumberManagement.css';

const EMPTY: RuleSave = { RULE_KEY: '', RULE_NAME: '', PREFIX: '', DATE_FORMAT: 'NONE', SEQUENCE_LENGTH: 4, START_VALUE: 1, INCREMENT_VALUE: 1, RESET_CYCLE: 'NONE', SCOPE_TYPE: 'GLOBAL', USE_YN: 'Y', DESCRIPTION: '' };
const labels: Record<string, string> = { NONE: '없음', YEAR: '연', MONTH: '월', GLOBAL: '전체', MODULE: '모듈', PROJECT: '프로젝트', Y: '사용', N: '중지', YYYY: 'YYYY', YYYYMM: 'YYYYMM' };

export default function DocumentNumberManagePage() {
  const [rows, setRows] = useState<DocumentNumberRule[]>([]);
  const [selected, setSelected] = useState<DocumentNumberRule | null>(null);
  const [draft, setDraft] = useState<RuleSave>(EMPTY);
  const [isNew, setIsNew] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [scopeKey, setScopeKey] = useState('');
  const [issues, setIssues] = useState<DocumentNumberIssue[]>([]);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formatLocked = Boolean(selected && selected.CURRENT_VALUE > 0);
  const canCreate = hasAction('ADMIN', 'DOC_NUMBER_MGMT', COMMON_ACTIONS.CREATE);
  const canUpdate = hasAction('ADMIN', 'DOC_NUMBER_MGMT', COMMON_ACTIONS.UPDATE);

  const refresh = useCallback(async (preserveKey?: string) => {
    const result = await documentNumberApi.list(keyword);
    setRows(result);
    const target = result.find((row) => row.RULE_KEY === preserveKey) ?? result[0] ?? null;
    setSelected(target);
    if (target) {
      setDraft({ RULE_KEY: target.RULE_KEY, RULE_NAME: target.RULE_NAME, PREFIX: target.PREFIX, DATE_FORMAT: target.DATE_FORMAT,
        SEQUENCE_LENGTH: target.SEQUENCE_LENGTH, START_VALUE: target.START_VALUE, INCREMENT_VALUE: target.INCREMENT_VALUE,
        RESET_CYCLE: target.RESET_CYCLE, SCOPE_TYPE: target.SCOPE_TYPE, USE_YN: target.USE_YN, DESCRIPTION: target.DESCRIPTION ?? '' });
      setIssues(await documentNumberApi.history(target.RULE_KEY, target.RULE_VERSION));
    } else { setDraft(EMPTY); setIssues([]); }
    setIsNew(false); setPreview('');
  }, [keyword]);
  useEffect(() => {
    let current = true;
    documentNumberApi.list(keyword).then(async (result) => {
      if (!current) return;
      setRows(result);
      const target = result[0] ?? null;
      setSelected(target);
      if (target) {
        setDraft({ RULE_KEY: target.RULE_KEY, RULE_NAME: target.RULE_NAME, PREFIX: target.PREFIX, DATE_FORMAT: target.DATE_FORMAT,
          SEQUENCE_LENGTH: target.SEQUENCE_LENGTH, START_VALUE: target.START_VALUE, INCREMENT_VALUE: target.INCREMENT_VALUE,
          RESET_CYCLE: target.RESET_CYCLE, SCOPE_TYPE: target.SCOPE_TYPE, USE_YN: target.USE_YN, DESCRIPTION: target.DESCRIPTION ?? '' });
        setIssues(await documentNumberApi.history(target.RULE_KEY, target.RULE_VERSION));
      } else { setDraft(EMPTY); setIssues([]); }
      setMessage(`${result.length}개 RULE을 조회했습니다.`);
    }).catch((error: unknown) => { if (current) setMessage(error instanceof Error ? error.message : '목록 조회 실패'); });
    return () => { current = false; };
  }, [keyword]);

  const columns = useMemo<DataTableColumn<DocumentNumberRule>[]>(() => [
    { key: 'RULE_KEY', header: 'RULE KEY', width: 150, render: (row) => row.RULE_KEY },
    { key: 'RULE_NAME', header: '규칙명', flex: 1.2, render: (row) => row.RULE_NAME },
    { key: 'PREFIX', header: '접두어', width: 90, render: (row) => row.PREFIX },
    { key: 'DATE_FORMAT', header: '날짜 형식', width: 100, render: (row) => labels[row.DATE_FORMAT] },
    { key: 'SEQUENCE_LENGTH', header: '순번 자리수', width: 95, align: 'right', render: (row) => row.SEQUENCE_LENGTH },
    { key: 'RESET_CYCLE', header: '초기화 주기', width: 95, render: (row) => labels[row.RESET_CYCLE] },
    { key: 'USE_YN', header: '사용 여부', width: 90, render: (row) => labels[row.USE_YN] },
  ], []);
  const issueColumns = useMemo<DataTableColumn<DocumentNumberIssue>[]>(() => [
    { key: 'DOCUMENT_NUMBER', header: '발급 번호', flex: 1, render: (row) => row.DOCUMENT_NUMBER },
    { key: 'ISSUE_STATUS', header: '상태', width: 100, render: (row) => row.ISSUE_STATUS },
    { key: 'SCOPE_KEY', header: '적용 범위', width: 130, render: (row) => row.SCOPE_KEY },
    { key: 'PERIOD_KEY', header: '기간', width: 90, render: (row) => row.PERIOD_KEY },
    { key: 'BUSINESS_REF', header: '업무 참조', flex: 1, render: (row) => row.BUSINESS_REF ?? '-' },
    { key: 'REG_DT', header: '발급일시', width: 170, render: (row) => row.REG_DT },
  ], []);

  const select = async (row: DocumentNumberRule) => {
    setSelected(row); setIsNew(false); setErrors({}); setPreview('');
    setDraft({ RULE_KEY: row.RULE_KEY, RULE_NAME: row.RULE_NAME, PREFIX: row.PREFIX, DATE_FORMAT: row.DATE_FORMAT,
      SEQUENCE_LENGTH: row.SEQUENCE_LENGTH, START_VALUE: row.START_VALUE, INCREMENT_VALUE: row.INCREMENT_VALUE,
      RESET_CYCLE: row.RESET_CYCLE, SCOPE_TYPE: row.SCOPE_TYPE, USE_YN: row.USE_YN, DESCRIPTION: row.DESCRIPTION ?? '' });
    try { setIssues(await documentNumberApi.history(row.RULE_KEY, row.RULE_VERSION)); setMessage(`RULE ${row.RULE_KEY} v${row.RULE_VERSION} 상세를 조회했습니다.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : '이력 조회 실패'); }
  };
  const change = (key: keyof RuleSave, value: string) => setDraft((current) => ({ ...current, [key]: ['SEQUENCE_LENGTH', 'START_VALUE', 'INCREMENT_VALUE'].includes(key) ? Number(value) : value }));
  const validate = () => {
    const next = validateDocumentNumberRule(draft);
    setErrors(next); return Object.keys(next).length === 0;
  };
  const save = async () => {
    if (!validate()) { setMessage('입력값을 확인해 주세요.'); return; }
    try {
      const result = isNew ? await documentNumberApi.create(draft) : selected ? await documentNumberApi.update(draft, selected.RULE_VERSION) : null;
      if (!result) return;
      setMessage(isNew ? `RULE ${result.RULE_KEY} v${result.RULE_VERSION}을 등록했습니다.` : 'RULE을 저장했습니다.');
      await refresh(result.RULE_KEY);
    } catch (error) { setMessage(error instanceof Error ? error.message : '저장 실패'); }
  };
  const disable = async () => {
    if (!selected || !window.confirm(`RULE ${selected.RULE_KEY} v${selected.RULE_VERSION} 사용을 중지할까요?`)) return;
    try { await documentNumberApi.usage(selected.RULE_KEY, selected.RULE_VERSION, 'N'); setMessage('RULE 사용을 중지했습니다.'); await refresh(selected.RULE_KEY); }
    catch (error) { setMessage(error instanceof Error ? error.message : '사용 중지 실패'); }
  };
  const showPreview = async () => {
    if (!selected && !isNew) { setMessage('미리볼 RULE을 선택하세요.'); return; }
    if (!validate()) return;
    try {
      const result = await documentNumberApi.preview(draft.RULE_KEY, selected?.RULE_VERSION, scopeKey, isNew ? draft : undefined);
      setPreview(result.DOCUMENT_NUMBER);
      setMessage('미리보기는 읽기 전용이며 번호를 소비하지 않습니다. 실제 발급 결과와 다를 수 있습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '미리보기 실패'); }
  };

  const field = (key: keyof RuleSave, label: string, required = false, locked = false) => <FormField key={key} label={label} required={required} error={errors[key]}>
    <input value={String(draft[key] ?? '')} disabled={locked} onChange={(event) => change(key, event.target.value)} aria-invalid={Boolean(errors[key])} />
  </FormField>;
  const selectField = (key: 'DATE_FORMAT' | 'RESET_CYCLE' | 'SCOPE_TYPE' | 'USE_YN', label: string, options: string[], locked = false) => <FormField key={key} label={label} required>
    <select value={draft[key]} disabled={locked} onChange={(event) => change(key, event.target.value)} aria-invalid={Boolean(errors[key])}>{options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}</select>
  </FormField>;
  const detailTop = <section className="document-number-detail">
    <div className="document-number-detail-heading"><h2>{isNew ? '신규 RULE' : selected ? `${selected.RULE_KEY} · v${selected.RULE_VERSION}` : 'RULE 상세'}</h2><span>{formatLocked ? '발급 시작: 형식 변경 불가' : '형식 수정 가능'}</span></div>
    <div className="document-number-form">
      {field('RULE_KEY', 'RULE KEY', true, !isNew)}{field('RULE_NAME', '규칙명', true)}{field('PREFIX', '접두어', true, formatLocked)}
      {selectField('DATE_FORMAT', '날짜 형식', ['NONE', 'YYYY', 'YYYYMM'], formatLocked)}
      {field('SEQUENCE_LENGTH', '순번 자리수', true, formatLocked)}{field('START_VALUE', '시작값', true, formatLocked)}{field('INCREMENT_VALUE', '증가량', true, formatLocked)}
      {selectField('RESET_CYCLE', '초기화 주기', ['NONE', 'YEAR', 'MONTH'], formatLocked)}{selectField('SCOPE_TYPE', '적용 범위', ['GLOBAL', 'MODULE', 'PROJECT'], formatLocked)}
      {selectField('USE_YN', '사용 여부', ['Y', 'N'])}
      <FormField label="설명"><input value={draft.DESCRIPTION ?? ''} onChange={(event) => change('DESCRIPTION', event.target.value)} /></FormField>
    </div>
    <div className="document-number-preview-controls"><FormField label="범위 키"><input value={scopeKey} placeholder="GLOBAL / 모듈 / 프로젝트" onChange={(event) => setScopeKey(event.target.value)} /></FormField>
      <ActionButton actionCode={COMMON_ACTIONS.SEARCH} label="번호 미리보기" onClick={showPreview} />{preview && <output aria-label="미리보기 번호">{preview}</output>}
      {selected && <span>현재 순번: {selected.CURRENT_VALUE.toLocaleString()}</span>}
    </div>
    <div className="document-number-actions">{(isNew ? canCreate : canUpdate) && <ActionButton actionCode={isNew ? COMMON_ACTIONS.CREATE : COMMON_ACTIONS.SAVE} label={isNew ? 'RULE 등록' : '저장'} tone="primary" onClick={save} />}
      {selected && selected.USE_YN === 'Y' && canUpdate && <ActionButton actionCode={COMMON_ACTIONS.UPDATE} label="사용 중지" tone="danger" onClick={disable} />}</div>
  </section>;
  const master = <section className="document-number-list">
    <div className="document-number-list-search"><label>RULE 검색<input value={keyword} placeholder="RULE KEY, 규칙명" onChange={(event) => setKeyword(event.target.value)} /></label>
      {canCreate && <ActionButton actionCode={COMMON_ACTIONS.CREATE} label="신규 RULE" onClick={() => { setSelected(null); setIssues([]); setDraft(EMPTY); setIsNew(true); setErrors({}); setPreview(''); }} />}</div>
    <BaseKitDataGrid programKey="DOC_NUMBER_MGMT" roleCode="ADMIN" title="채번 규칙 목록" columns={columns} rows={rows} getRowKey={(row) => `${row.RULE_KEY}:${row.RULE_VERSION}`} onRowClick={select} selectable={false} emptyMessage="등록된 RULE이 없습니다." />
  </section>;
  const detailBottom = <BaseKitDataGrid programKey="DOC_NUMBER_MGMT" roleCode="ADMIN" title="발급 이력" columns={issueColumns} rows={issues} getRowKey={(row) => row.ISSUE_ID} selectable={false} emptyMessage="발급 이력이 없습니다." />;
  return <div className="page document-number-management">
    <PageHeader breadcrumbs={['시스템관리', '채번관리']} description="업무 최초 저장에서 사용할 공통 채번 규칙을 관리합니다. 번호는 업무 저장 Backend에서만 발급됩니다." />
    <MasterDetailMultiGrid master={master} detailTop={detailTop} detailBottom={detailBottom} masterWidth="48%" message={message || '미리보기는 번호를 소비하지 않습니다.'} detailTopSizing="content" />
  </div>;
}
