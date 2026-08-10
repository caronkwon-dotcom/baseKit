import { useEffect, useMemo, useState } from 'react';
import wordsJson from '../../../../meta/words.json';
import PageHeader from '../../../components/common/PageHeader';
import { loadEditableMetadata, saveEditableMetadata, type PersistenceMode } from '../metadataStandard/editableMetadata.repository';
import type { StandardWord } from '../metadataStandard/metadataStandard.types';

const EMPTY_WORD: StandardWord = { wordKey: '', logicalName: '', englishName: '', abbreviation: '', wordType: 'GENERAL', description: '', useYn: 'Y', reviewStatus: 'DRAFT' };
const STATUS_LABEL = { DRAFT: '신규등록', REVIEWING: '수정·검토 중', APPROVED: '검수완료' } as const;

function normalize(value: string) { return value.replace(/[\s_-]/g, '').toLowerCase(); }
function levenshtein(left: string, right: string) {
  const matrix = Array.from({ length: right.length + 1 }, () => Array(left.length + 1).fill(0));
  for (let column = 0; column <= left.length; column += 1) matrix[0][column] = column;
  for (let row = 0; row <= right.length; row += 1) matrix[row][0] = row;
  for (let row = 1; row <= right.length; row += 1) for (let column = 1; column <= left.length; column += 1) matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + (right[row - 1] === left[column - 1] ? 0 : 1));
  return matrix[right.length][left.length];
}
function similarity(left: string, right: string) {
  const normalizedLeft = normalize(left); const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.85;
  return 1 - levenshtein(normalizedLeft, normalizedRight) / Math.max(normalizedLeft.length, normalizedRight.length);
}

export default function WordManagePage() {
  const [rows, setRows] = useState<StandardWord[]>(wordsJson as StandardWord[]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<StandardWord>(EMPTY_WORD);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<PersistenceMode>('BROWSER');
  const [message, setMessage] = useState('');
  const [similarityChecked, setSimilarityChecked] = useState(false);
  const [similarWords, setSimilarWords] = useState<Array<{ word: StandardWord; reason: string }>>([]);

  useEffect(() => { loadEditableMetadata('words', wordsJson as StandardWord[]).then((loaded) => { setRows(loaded.rows); setMode(loaded.mode); }); }, []);
  const filtered = useMemo(() => rows.filter((row) => [row.logicalName, row.englishName, row.abbreviation].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))), [rows, keyword]);

  const select = (row: StandardWord) => { setSelectedKey(row.wordKey); setDraft({ ...row }); setSimilarityChecked(false); setSimilarWords([]); setMessage(''); };
  const startNew = () => { setSelectedKey(''); setDraft(EMPTY_WORD); setSimilarityChecked(false); setSimilarWords([]); setMessage('신규 단어는 유사어 검사 후 저장할 수 있습니다.'); };
  const change = <K extends keyof StandardWord>(key: K, value: StandardWord[K]) => {
    setDraft((current) => ({ ...current, [key]: value, reviewStatus: selectedKey && current.reviewStatus === 'APPROVED' ? 'REVIEWING' : current.reviewStatus }));
    if (key === 'logicalName' || key === 'englishName' || key === 'abbreviation') { setSimilarityChecked(false); setSimilarWords([]); }
  };
  const checkSimilarity = () => {
    if (!draft.logicalName.trim() || !draft.englishName.trim() || !draft.abbreviation.trim()) { setMessage('논리명, 영문명, 약어를 입력한 뒤 검사하세요.'); return; }
    const candidates = rows.filter((row) => row.wordKey !== selectedKey).map((word) => {
      const logicalScore = similarity(draft.logicalName, word.logicalName);
      const englishScore = similarity(draft.englishName, word.englishName);
      const abbreviationScore = similarity(draft.abbreviation, word.abbreviation);
      const maxScore = Math.max(logicalScore, englishScore, abbreviationScore);
      const reason = logicalScore === maxScore ? '논리명' : englishScore === maxScore ? '영문명' : '약어';
      return { word, reason: `${reason} ${(maxScore * 100).toFixed(0)}%`, score: maxScore };
    }).filter((candidate) => candidate.score >= 0.6).sort((left, right) => right.score - left.score).slice(0, 8).map(({ word, reason }) => ({ word, reason }));
    setSimilarWords(candidates); setSimilarityChecked(true);
    setMessage(candidates.length ? `유사 후보 ${candidates.length}건을 확인하세요.` : '유사 단어가 없습니다. 등록할 수 있습니다.');
  };
  const persist = async (reviewStatus: StandardWord['reviewStatus']) => {
    const normalized = { ...draft, wordKey: draft.wordKey.trim().toUpperCase(), abbreviation: draft.abbreviation.trim().toUpperCase(), reviewStatus };
    if (!normalized.wordKey || !normalized.logicalName || !normalized.englishName || !normalized.abbreviation) { setMessage('단어키, 논리명, 영문명, 약어는 필수입니다.'); return; }
    if (!selectedKey && !similarityChecked) { setMessage('신규 등록 전 유사어 검사를 완료하세요.'); return; }
    if (rows.some((row) => row.wordKey === normalized.wordKey && row.wordKey !== selectedKey)) { setMessage('중복된 단어키입니다.'); return; }
    if (rows.some((row) => normalize(row.logicalName) === normalize(normalized.logicalName) && row.wordKey !== selectedKey)) { setMessage('동일한 논리명이 이미 등록되어 있습니다.'); return; }
    if (rows.some((row) => normalize(row.abbreviation) === normalize(normalized.abbreviation) && row.wordKey !== selectedKey)) { setMessage('동일한 영문 약어가 이미 등록되어 있습니다.'); return; }
    const next = selectedKey ? rows.map((row) => row.wordKey === selectedKey ? normalized : row) : [...rows, normalized];
    await saveEditableMetadata('words', next, mode); setRows(next); setSelectedKey(normalized.wordKey); setDraft(normalized);
    setMessage(`${STATUS_LABEL[reviewStatus]} 상태로 ${mode === 'FILE' ? 'meta/words.json에' : '브라우저에'} 저장했습니다.`);
  };

  return <div className="page metadata-manage-page">
    <PageHeader breadcrumbs={['시스템관리', '단어관리']} description="신규·수정 단어를 유사어 검사 후 검수완료 처리합니다." />
    <section className="metadata-toolbar"><label>단어검색<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="논리명·영문명·약어" /></label><span className={`persistence-badge ${mode.toLowerCase()}`}>{mode === 'FILE' ? '로컬 JSON 직접 저장' : '브라우저 임시 저장'}</span><button type="button" className="secondary-button" onClick={startNew}>신규</button><button type="button" className="secondary-button" onClick={checkSimilarity}>유사어 검사</button><button type="button" className="secondary-button" onClick={() => persist(selectedKey ? 'REVIEWING' : 'DRAFT')}>임시저장</button><button type="button" className="primary-button" onClick={() => persist('APPROVED')}>검수완료</button></section>
    <div className="metadata-master-detail"><section className="metadata-list"><div className="metadata-list-title"><h2>표준단어 목록</h2><span>총 {filtered.length.toLocaleString()}건</span></div><div className="metadata-table-wrap"><table><thead><tr><th>상태</th><th>단어키</th><th>논리명</th><th>영문명</th><th>약어</th><th>구분</th><th>사용</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.wordKey} className={row.wordKey === selectedKey ? 'selected-row' : 'clickable-row'} onClick={() => select(row)}><td><span className={`word-review-status ${row.reviewStatus.toLowerCase()}`}>{STATUS_LABEL[row.reviewStatus]}</span></td><td>{row.wordKey}</td><td>{row.logicalName}</td><td>{row.englishName}</td><td>{row.abbreviation}</td><td>{row.wordType === 'DOMAIN' ? '도메인 단어' : '일반 단어'}</td><td>{row.useYn}</td></tr>)}</tbody></table></div></section>
      <aside className="metadata-editor"><h2>단어 상세</h2><label>단어키<input value={draft.wordKey} disabled={Boolean(selectedKey)} onChange={(event) => change('wordKey', event.target.value)} /></label><label>논리명<input value={draft.logicalName} onChange={(event) => change('logicalName', event.target.value)} /></label><label>영문명<input value={draft.englishName} onChange={(event) => change('englishName', event.target.value)} /></label><label>영문 약어<input value={draft.abbreviation} onChange={(event) => change('abbreviation', event.target.value)} /></label><label>단어 구분<select value={draft.wordType} onChange={(event) => change('wordType', event.target.value as StandardWord['wordType'])}><option value="GENERAL">일반 단어</option><option value="DOMAIN">도메인 단어</option></select></label><label>설명<textarea rows={3} value={draft.description} onChange={(event) => change('description', event.target.value)} /></label><label>사용 여부<select value={draft.useYn} onChange={(event) => change('useYn', event.target.value as 'Y' | 'N')}><option value="Y">사용</option><option value="N">미사용</option></select></label>
        <section className={`similarity-result ${similarityChecked ? 'checked' : ''}`}><h3>유사어 검사 {similarityChecked ? '완료' : '필요'}</h3>{similarWords.length ? <ul>{similarWords.map(({ word, reason }) => <li key={word.wordKey}><button type="button" onClick={() => select(word)}><strong>{word.logicalName}</strong><span>{word.englishName} · {word.abbreviation}</span><em>{reason}</em></button></li>)}</ul> : <p>{similarityChecked ? '유사 후보 없음' : '신규 단어 저장 전에 검사를 실행하세요.'}</p>}</section>
        <p className="status-message">{message}</p></aside>
    </div>
  </div>;
}
