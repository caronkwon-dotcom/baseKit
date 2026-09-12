import { useEffect, useState } from 'react';
import { DataTable, PageHeader, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../../../../components/common';
import { getStandardDesignTerm, recommendStandardDesignTerm, searchStandardDesignTerms } from '../../terms/standardDesignTerms.repository';
import type { StandardDesignTerm } from '../../terms/standardDesignTerms.types';
import type { StandardDesignTermLlmResult } from '../../terms/standardDesignTerms.types';

interface TermSearchCondition {
  keyword: string;
}

const PAGE_SIZE = 50;
const INITIAL_CONDITION: TermSearchCondition = { keyword: '' };

const columns: DataTableColumn<StandardDesignTerm>[] = [
  { key: 'COMMON_STANDARD_TERM_NAME', header: '공통표준용어명', render: (row) => row.COMMON_STANDARD_TERM_NAME },
  { key: 'COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME', header: '영문약어명', render: (row) => row.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME },
  { key: 'COMMON_STANDARD_DOMAIN_NAME', header: '공통표준도메인명', render: (row) => row.COMMON_STANDARD_DOMAIN_NAME },
  { key: 'STORAGE_FORMAT', header: '저장 형식', render: (row) => row.STORAGE_FORMAT || '-' },
  { key: 'ESTABLISHMENT_ROUND', header: '제정차수', render: (row) => row.ESTABLISHMENT_ROUND || '-' },
  { key: 'REVISION_TYPE_NAME', header: '개정구분', render: (row) => row.REVISION_TYPE_NAME || '-' },
];

export default function TermGlossaryPage() {
  const [condition, setCondition] = useState(INITIAL_CONDITION);
  const [searchedCondition, setSearchedCondition] = useState(INITIAL_CONDITION);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ ITEMS: StandardDesignTerm[]; TOTAL_COUNT: number; TOTAL_PAGES: number } | null>(null);
  const [selected, setSelected] = useState<StandardDesignTerm | null>(null);
  const [message, setMessage] = useState('용어집을 불러오는 중입니다.');
  const [question, setQuestion] = useState('');
  const [recommendation, setRecommendation] = useState<StandardDesignTermLlmResult | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  useEffect(() => {
    let active = true;
    searchStandardDesignTerms(searchedCondition.keyword, page, PAGE_SIZE)
      .then((next) => {
        if (!active) return;
        setResult(next);
        setSelected(next.ITEMS[0] ? null : null);
        setMessage(`${next.TOTAL_COUNT.toLocaleString()}건을 조회했습니다.`);
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : '용어집 조회에 실패했습니다.'));
    return () => { active = false; };
  }, [searchedCondition, page]);

  const selectTerm = (term: StandardDesignTerm) => {
    getStandardDesignTerm(term.TERM_ID)
      .then(setSelected)
      .catch((error) => setMessage(error instanceof Error ? error.message : '용어 상세를 조회하지 못했습니다.'));
  };

  const requestRecommendation = async () => {
    const nextQuestion = question.trim();
    if (!nextQuestion) return;
    setRecommendationLoading(true);
    try {
      setRecommendation(await recommendStandardDesignTerm(nextQuestion));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '표준용어 추천에 실패했습니다.');
    } finally {
      setRecommendationLoading(false);
    }
  };

  const searchFields: SearchFieldConfig<TermSearchCondition>[] = [
    { key: 'keyword', label: '통합검색', placeholder: '용어명, 약어, 설명, 도메인, 동의어' },
  ];

  return (
    <section className="page standard-design-term-glossary">
      <PageHeader breadcrumbs={['Standard Design', '표준용어집']} description="고객 표준 설계에 사용할 행정표준 공통용어 원본을 조회합니다." />
      <SearchPanel
        fields={searchFields}
        value={condition}
        initialValue={INITIAL_CONDITION}
        onValueChange={setCondition}
        onSearch={(next) => { setSearchedCondition(next); setPage(1); }}
        onReset={(next) => { setSearchedCondition(next); setPage(1); }}
      />
      <section className="standard-design-term-ai">
        <h2>LLM 표준용어 PoC</h2>
        <p>LLM은 질문과 CSV 검색 후보만 사용하며, 추천 ID는 원본 상세 조회로 검증합니다.</p>
        <div className="standard-design-term-ai-form">
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 구매요청 번호" />
          <button type="button" disabled={recommendationLoading || !question.trim()} onClick={() => void requestRecommendation()}>
            {recommendationLoading ? '분석 중...' : '추천'}
          </button>
        </div>
        {recommendation ? (
          <div className="standard-design-term-ai-result">
            <strong>{recommendation.answer}</strong>
            <span>의도: {recommendation.interpretedIntent}</span>
            <span>검색어: {recommendation.searchKeywords.join(', ')}</span>
            <span>추천 ID: {recommendation.recommendedTermId ?? '없음'}</span>
          </div>
        ) : null}
      </section>
      <section className="standard-design-term-summary">
        <strong>원본 CSV read-only Adapter</strong>
        <span>{result?.TOTAL_COUNT.toLocaleString() ?? '0'}건</span>
        <button type="button" disabled={!result || page <= 1} onClick={() => setPage((current) => current - 1)}>이전</button>
        <span>{page} / {result?.TOTAL_PAGES ?? 1}</span>
        <button type="button" disabled={!result || page >= (result?.TOTAL_PAGES ?? 1)} onClick={() => setPage((current) => current + 1)}>다음</button>
      </section>
      <div className="standard-design-term-layout">
        <DataTable columns={columns} rows={result?.ITEMS ?? []} getRowKey={(row) => row.TERM_ID} onRowClick={selectTerm} emptyMessage="검색조건에 해당하는 용어가 없습니다." />
        <aside className="standard-design-term-detail" aria-label="표준용어 상세">
          <h2>용어 상세</h2>
          {selected ? (
            <dl>
              <dt>공통표준용어명</dt><dd>{selected.COMMON_STANDARD_TERM_NAME}</dd>
              <dt>설명</dt><dd>{selected.COMMON_STANDARD_TERM_DESCRIPTION || '-'}</dd>
              <dt>영문약어명</dt><dd>{selected.COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME || '-'}</dd>
              <dt>공통표준도메인명</dt><dd>{selected.COMMON_STANDARD_DOMAIN_NAME || '-'}</dd>
              <dt>허용값</dt><dd>{selected.ALLOWED_VALUES || '-'}</dd>
              <dt>저장 형식</dt><dd>{selected.STORAGE_FORMAT || '-'}</dd>
              <dt>표현 형식</dt><dd>{selected.DISPLAY_FORMAT || '-'}</dd>
              <dt>행정표준코드명</dt><dd>{selected.ADMINISTRATIVE_STANDARD_CODE_NAME || '-'}</dd>
              <dt>소관기관명</dt><dd>{selected.RESPONSIBLE_ORGANIZATION_NAME || '-'}</dd>
              <dt>용어 이음동의어</dt><dd>{selected.TERM_SYNONYMS || '-'}</dd>
              <dt>제정차수</dt><dd>{selected.ESTABLISHMENT_ROUND || '-'}</dd>
              <dt>개정</dt><dd>{selected.REVISION_TYPE_NAME || '-'} · {selected.REVISION_ITEM || '-'} · {selected.REVISION_REASON || '-'}</dd>
            </dl>
          ) : <p>목록에서 용어를 선택하세요.</p>}
        </aside>
      </div>
      <p className="status-message">{message}</p>
    </section>
  );
}
