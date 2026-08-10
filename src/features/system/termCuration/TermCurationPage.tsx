import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../../../components/common/SearchPanel';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { hasAction } from '../../../repositories/metadataRepository';
import {
  downloadCuration,
  loadCuration,
  loadStandardTerms,
  saveCuration,
} from './termCuration.repository';
import type {
  ReviewStatus,
  StandardTerm,
  TermCurationDocument,
  TermReview,
  TermSearchCondition,
} from './termCuration.types';

const PAGE_SIZE = 100;
const INITIAL_SEARCH: TermSearchCondition = { keyword: '', domainName: '', reviewStatus: '', revisionType: '' };
const STATUS_LABELS: Record<ReviewStatus, string> = {
  UNREVIEWED: '미검토', REVIEWING: '검토 중', ADOPTED: '채택', MODIFIED: '수정 채택', HOLD: '보류', EXCLUDED: '제외',
};

function defaultReview(term: StandardTerm): TermReview {
  return {
    status: 'UNREVIEWED', physicalName: term.abbreviation, domainName: term.domainName,
    description: term.description, alias: term.synonymList, note: '', updatedAt: '',
  };
}

export default function TermCurationPage() {
  const [terms, setTerms] = useState<StandardTerm[]>([]);
  const [curation, setCuration] = useState<TermCurationDocument>({ version: 1, updatedAt: null, reviews: {} });
  const [persistenceMode, setPersistenceMode] = useState<'FILE' | 'BROWSER'>('BROWSER');
  const [condition, setCondition] = useState(INITIAL_SEARCH);
  const [appliedCondition, setAppliedCondition] = useState(INITIAL_SEARCH);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('원본 데이터를 불러오는 중입니다.');

  useEffect(() => {
    Promise.all([loadStandardTerms(), loadCuration()])
      .then(([sourceTerms, saved]) => {
        setTerms(sourceTerms); setCuration(saved.document); setPersistenceMode(saved.mode);
        setSelectedId(sourceTerms[0]?.id ?? '');
        setMessage(`${sourceTerms.length.toLocaleString()}건을 불러왔습니다.`);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : '데이터 로딩 실패'));
  }, []);

  const domains = useMemo(() => [...new Set(terms.map((term) => term.domainName))].filter(Boolean).sort(), [terms]);
  const searchFields: SearchFieldConfig<TermSearchCondition>[] = [
    { key: 'keyword', label: '통합검색', placeholder: '논리명, 영문약어, 설명' },
    { key: 'domainName', label: '도메인', controlType: 'select', options: [{ value: '', label: '전체' }, ...domains.map((value) => ({ value, label: value }))] },
    { key: 'reviewStatus', label: '검토상태', controlType: 'select', options: [{ value: '', label: '전체' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))] },
    { key: 'revisionType', label: '개정구분', controlType: 'select', options: [{ value: '', label: '전체' }, { value: 'NORMAL', label: '정상' }, { value: 'CHANGED', label: '폐기·변경' }] },
  ];

  const filtered = useMemo(() => terms.filter((term) => {
    const reviewStatus = curation.reviews[term.id]?.status ?? 'UNREVIEWED';
    const keyword = appliedCondition.keyword.trim().toLowerCase();
    return (!keyword || [term.logicalName, term.abbreviation, term.description, term.synonymList].some((value) => value.toLowerCase().includes(keyword)))
      && (!appliedCondition.domainName || term.domainName === appliedCondition.domainName)
      && (!appliedCondition.reviewStatus || reviewStatus === appliedCondition.reviewStatus)
      && (!appliedCondition.revisionType || (appliedCondition.revisionType === 'NORMAL' ? !term.revisionType : Boolean(term.revisionType)));
  }), [terms, curation.reviews, appliedCondition]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleTerms = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedTerm = terms.find((term) => term.id === selectedId);
  const selectedReview = selectedTerm ? curation.reviews[selectedTerm.id] ?? defaultReview(selectedTerm) : undefined;
  const reviewedCount = Object.values(curation.reviews).filter((review) => review.status !== 'UNREVIEWED').length;

  const updateReview = (changes: Partial<TermReview>) => {
    if (!selectedTerm || !selectedReview) return;
    setCuration((current) => ({
      ...current,
      reviews: { ...current.reviews, [selectedTerm.id]: { ...selectedReview, ...changes, updatedAt: new Date().toISOString() } },
    }));
  };

  const handleSave = async () => {
    const next = { ...curation, updatedAt: new Date().toISOString() };
    try {
      await saveCuration(next, persistenceMode); setCuration(next);
      setMessage(persistenceMode === 'FILE' ? 'meta/term-curation.json에 저장했습니다.' : '배포 화면의 브라우저 저장소에 임시 저장했습니다. JSON을 내려받아 보관하세요.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '저장 실패'); }
  };

  return (
    <div className="page term-curation-page">
      <PageHeader breadcrumbs={['시스템관리', '표준용어관리']} description="공공표준 원본을 보존하면서 BaseKit 채택 용어를 단계적으로 정제합니다." />
      <SearchPanel
        fields={searchFields} value={condition} initialValue={INITIAL_SEARCH} rows={1}
        onValueChange={setCondition}
        onSearch={(next) => { setAppliedCondition(next); setPage(1); }}
        onReset={(next) => { setAppliedCondition(next); setPage(1); }}
      />

      <section className="term-workbench-summary">
        <span>원본 <strong>{terms.length.toLocaleString()}</strong>건</span>
        <span>조회 <strong>{filtered.length.toLocaleString()}</strong>건</span>
        <span>검토완료 <strong>{reviewedCount.toLocaleString()}</strong>건</span>
        <span className={`persistence-badge ${persistenceMode.toLowerCase()}`}>{persistenceMode === 'FILE' ? '로컬 JSON 직접 저장' : '브라우저 임시 저장'}</span>
        {hasAction('ADMIN', 'TERM_CURATION', COMMON_ACTIONS.EXCEL_DOWNLOAD) ? <button type="button" className="secondary-button" onClick={() => downloadCuration(curation)}>JSON 내려받기</button> : null}
        {hasAction('ADMIN', 'TERM_CURATION', COMMON_ACTIONS.SAVE) ? <button type="button" className="primary-button" onClick={handleSave}>정제내용 저장</button> : null}
      </section>

      <div className="term-workbench">
        <section className="term-list-panel" aria-label="공공표준용어 목록">
          <div className="term-list-heading">
            <h2>공공표준용어 목록</h2>
            <div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>이전</button><span>{page.toLocaleString()} / {pageCount.toLocaleString()}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>다음</button></div>
          </div>
          <div className="term-table-wrap">
            <table>
              <thead><tr><th>검토상태</th><th>공통표준용어명</th><th>영문약어명</th><th>도메인</th><th>저장 형식</th><th>제정차수</th><th>개정구분</th></tr></thead>
              <tbody>{visibleTerms.map((term) => {
                const status = curation.reviews[term.id]?.status ?? 'UNREVIEWED';
                return <tr key={term.id} className={term.id === selectedId ? 'selected-row' : 'clickable-row'} onClick={() => setSelectedId(term.id)}>
                  <td><span className={`review-status status-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span></td><td>{term.logicalName}</td><td>{term.abbreviation}</td><td>{term.domainName}</td><td>{term.storageFormat}</td><td>{term.revision}</td><td>{term.revisionType || '-'}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>

        <aside className="term-review-panel">
          <h2>정제 상세</h2>
          {selectedTerm && selectedReview ? <>
            <div className="source-term-card"><strong>{selectedTerm.logicalName}</strong><span>{selectedTerm.abbreviation} · {selectedTerm.domainName}</span><p>{selectedTerm.description}</p><dl><dt>허용값</dt><dd>{selectedTerm.allowedValues || '-'}</dd><dt>동의어</dt><dd>{selectedTerm.synonymList || '-'}</dd></dl></div>
            <label>검토상태<select value={selectedReview.status} onChange={(event) => updateReview({ status: event.target.value as ReviewStatus })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>BaseKit 물리명<input value={selectedReview.physicalName} onChange={(event) => updateReview({ physicalName: event.target.value.toUpperCase() })} /></label>
            <label>BaseKit 도메인<input value={selectedReview.domainName} onChange={(event) => updateReview({ domainName: event.target.value })} /></label>
            <label>설명<textarea rows={4} value={selectedReview.description} onChange={(event) => updateReview({ description: event.target.value })} /></label>
            <label>별칭·동의어<input value={selectedReview.alias} onChange={(event) => updateReview({ alias: event.target.value })} /></label>
            <label>검토 메모<textarea rows={3} value={selectedReview.note} onChange={(event) => updateReview({ note: event.target.value })} /></label>
          </> : <p>목록에서 용어를 선택하세요.</p>}
        </aside>
      </div>
      <p className="status-message">{message}</p>
    </div>
  );
}
