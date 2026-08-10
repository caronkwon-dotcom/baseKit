import { useEffect, useMemo, useState } from 'react';
import wordsJson from '../../../../meta/words.json';
import PageHeader from '../../../components/common/PageHeader';
import { loadEditableMetadata, saveEditableMetadata, type PersistenceMode } from '../metadataStandard/editableMetadata.repository';
import type { StandardWord } from '../metadataStandard/metadataStandard.types';

const EMPTY_WORD: StandardWord = { wordKey: '', logicalName: '', englishName: '', abbreviation: '', wordType: 'GENERAL', description: '', useYn: 'Y' };

export default function WordManagePage() {
  const [rows, setRows] = useState<StandardWord[]>(wordsJson as StandardWord[]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<StandardWord>(EMPTY_WORD);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<PersistenceMode>('BROWSER');
  const [message, setMessage] = useState('');

  useEffect(() => { loadEditableMetadata('words', wordsJson as StandardWord[]).then((loaded) => { setRows(loaded.rows); setMode(loaded.mode); }); }, []);
  const filtered = useMemo(() => rows.filter((row) => [row.logicalName, row.englishName, row.abbreviation].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))), [rows, keyword]);

  const select = (row: StandardWord) => { setSelectedKey(row.wordKey); setDraft({ ...row }); };
  const saveRow = async () => {
    const normalized = { ...draft, wordKey: draft.wordKey.trim().toUpperCase(), abbreviation: draft.abbreviation.trim().toUpperCase() };
    if (!normalized.wordKey || !normalized.logicalName || !normalized.abbreviation) { setMessage('단어키, 논리명, 약어는 필수입니다.'); return; }
    if (rows.some((row) => row.wordKey === normalized.wordKey && row.wordKey !== selectedKey)) { setMessage('중복된 단어키입니다.'); return; }
    const next = selectedKey ? rows.map((row) => row.wordKey === selectedKey ? normalized : row) : [...rows, normalized];
    await saveEditableMetadata('words', next, mode); setRows(next); setSelectedKey(normalized.wordKey); setDraft(normalized);
    setMessage(mode === 'FILE' ? 'meta/words.json에 저장했습니다.' : '브라우저에 임시 저장했습니다.');
  };

  return <div className="page metadata-manage-page">
    <PageHeader breadcrumbs={['시스템관리', '단어관리']} description="용어를 구성하는 최소 단위와 표준 영문 약어를 관리합니다." />
    <section className="metadata-toolbar"><label>단어검색<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="논리명·영문명·약어" /></label><span className={`persistence-badge ${mode.toLowerCase()}`}>{mode === 'FILE' ? '로컬 JSON 직접 저장' : '브라우저 임시 저장'}</span><button type="button" className="secondary-button" onClick={() => { setSelectedKey(''); setDraft(EMPTY_WORD); }}>신규</button><button type="button" className="primary-button" onClick={saveRow}>저장</button></section>
    <div className="metadata-master-detail"><section className="metadata-list"><div className="metadata-list-title"><h2>표준단어 목록</h2><span>총 {filtered.length.toLocaleString()}건</span></div><div className="metadata-table-wrap"><table><thead><tr><th>단어키</th><th>논리명</th><th>영문명</th><th>약어</th><th>구분</th><th>사용</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.wordKey} className={row.wordKey === selectedKey ? 'selected-row' : 'clickable-row'} onClick={() => select(row)}><td>{row.wordKey}</td><td>{row.logicalName}</td><td>{row.englishName}</td><td>{row.abbreviation}</td><td>{row.wordType === 'DOMAIN' ? '도메인 단어' : '일반 단어'}</td><td>{row.useYn}</td></tr>)}</tbody></table></div></section>
      <aside className="metadata-editor"><h2>단어 상세</h2><label>단어키<input value={draft.wordKey} disabled={Boolean(selectedKey)} onChange={(event) => setDraft({ ...draft, wordKey: event.target.value })} /></label><label>논리명<input value={draft.logicalName} onChange={(event) => setDraft({ ...draft, logicalName: event.target.value })} /></label><label>영문명<input value={draft.englishName} onChange={(event) => setDraft({ ...draft, englishName: event.target.value })} /></label><label>영문 약어<input value={draft.abbreviation} onChange={(event) => setDraft({ ...draft, abbreviation: event.target.value })} /></label><label>단어 구분<select value={draft.wordType} onChange={(event) => setDraft({ ...draft, wordType: event.target.value as StandardWord['wordType'] })}><option value="GENERAL">일반 단어</option><option value="DOMAIN">도메인 단어</option></select></label><label>설명<textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>사용 여부<select value={draft.useYn} onChange={(event) => setDraft({ ...draft, useYn: event.target.value as 'Y' | 'N' })}><option value="Y">사용</option><option value="N">미사용</option></select></label><p className="status-message">{message}</p></aside>
    </div>
  </div>;
}
