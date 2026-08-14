import { useEffect, useMemo, useState } from 'react';

interface DecomposedTerm {
  termId: number;
  logicalName: string;
  physicalName: string;
  domainName: string;
  wordKeys: string[];
  unmatchedTokens: string[];
  decompositionStatus: 'MATCHED' | 'UNMATCHED';
}

export default function TermDecompositionSummary() {
  const [rows, setRows] = useState<DecomposedTerm[]>([]);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/term-word-decomposition-20251101.json`).then((response) => response.json()).then(setRows); }, []);
  const matched = useMemo(() => rows.filter((row) => row.decompositionStatus === 'MATCHED').length, [rows]);
  const unmatchedTokens = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => row.unmatchedTokens.forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1)));
    return [...counts].sort((left, right) => right[1] - left[1]).slice(0, 10);
  }, [rows]);

  return <section className="decomposition-summary"><div><h2>공식 단어 기준 용어 분리</h2><p>검수완료 단어가 늘어나면 용어 생성 후보로 단계적으로 승격합니다.</p></div><span>전체 <strong>{rows.length.toLocaleString()}</strong>건</span><span className="matched">완전분리 <strong>{matched.toLocaleString()}</strong>건</span><span className="unmatched">미매칭 <strong>{(rows.length - matched).toLocaleString()}</strong>건</span>{unmatchedTokens.length ? <details><summary>상위 미매칭 토큰</summary><div>{unmatchedTokens.map(([token, count]) => <em key={token}>{token || '(빈 값)'} {count}건</em>)}</div></details> : null}</section>;
}
