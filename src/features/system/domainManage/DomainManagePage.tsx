import { useEffect, useMemo, useState } from 'react';
import domainsJson from '../../../../meta/domains.json';
import wordsJson from '../../../../meta/words.json';
import PageHeader from '../../../components/common/PageHeader';
import { loadEditableMetadata, saveEditableMetadata, type PersistenceMode } from '../metadataStandard/editableMetadata.repository';
import type { StandardDomain, StandardWord } from '../metadataStandard/metadataStandard.types';

const EMPTY_DOMAIN: StandardDomain = { domainKey: '', domain: '', domainName: '', domainWordKey: '', dataType: 'VARCHAR', length: null, scale: null, allowedValues: '', description: '', useYn: 'Y' };

export default function DomainManagePage() {
  const [rows, setRows] = useState<StandardDomain[]>(domainsJson as StandardDomain[]);
  const [words, setWords] = useState<StandardWord[]>(wordsJson as StandardWord[]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<StandardDomain>(EMPTY_DOMAIN);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<PersistenceMode>('BROWSER');
  const [message, setMessage] = useState('');

  useEffect(() => { Promise.all([loadEditableMetadata('domains', domainsJson as StandardDomain[]), loadEditableMetadata('words', wordsJson as StandardWord[])]).then(([domainData, wordData]) => { setRows(domainData.rows); setWords(wordData.rows); setMode(domainData.mode); }); }, []);
  const domainWords = words.filter((word) => word.wordType === 'DOMAIN' && word.useYn === 'Y');
  const filtered = useMemo(() => rows.filter((row) => [row.domainName, row.domainKey, row.dataType].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))), [rows, keyword]);
  const select = (row: StandardDomain) => { setSelectedKey(row.domainKey); setDraft({ ...row }); };
  const saveRow = async () => {
    const normalized = { ...draft, domainKey: draft.domainKey.trim().toUpperCase(), domain: draft.domain.trim().toUpperCase() };
    if (!normalized.domainKey || !normalized.domainName || !normalized.domainWordKey) { setMessage('도메인키, 도메인명, 마지막 단어는 필수입니다.'); return; }
    if (rows.some((row) => row.domainKey === normalized.domainKey && row.domainKey !== selectedKey)) { setMessage('중복된 도메인키입니다.'); return; }
    const next = selectedKey ? rows.map((row) => row.domainKey === selectedKey ? normalized : row) : [...rows, normalized];
    await saveEditableMetadata('domains', next, mode); setRows(next); setSelectedKey(normalized.domainKey); setDraft(normalized);
    setMessage(mode === 'FILE' ? 'meta/domains.json에 저장했습니다.' : '브라우저에 임시 저장했습니다.');
  };

  return <div className="page metadata-manage-page"><PageHeader breadcrumbs={['시스템관리', '도메인관리']} description="용어의 마지막 단어에 데이터 타입과 길이·허용값을 연결합니다." />
    <section className="metadata-toolbar"><label>도메인검색<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="도메인명·키·타입" /></label><span className={`persistence-badge ${mode.toLowerCase()}`}>{mode === 'FILE' ? '로컬 JSON 직접 저장' : '브라우저 임시 저장'}</span><button type="button" className="secondary-button" onClick={() => { setSelectedKey(''); setDraft(EMPTY_DOMAIN); }}>신규</button><button type="button" className="primary-button" onClick={saveRow}>저장</button></section>
    <div className="metadata-master-detail"><section className="metadata-list"><div className="metadata-list-title"><h2>표준도메인 목록</h2><span>총 {filtered.length.toLocaleString()}건</span></div><div className="metadata-table-wrap"><table><thead><tr><th>도메인키</th><th>도메인명</th><th>마지막 단어</th><th>데이터 타입</th><th>길이</th><th>소수점</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.domainKey} className={row.domainKey === selectedKey ? 'selected-row' : 'clickable-row'} onClick={() => select(row)}><td>{row.domainKey}</td><td>{row.domainName}</td><td>{words.find((word) => word.wordKey === row.domainWordKey)?.logicalName ?? row.domainWordKey}</td><td>{row.dataType}</td><td>{row.length ?? '-'}</td><td>{row.scale ?? '-'}</td></tr>)}</tbody></table></div></section>
      <aside className="metadata-editor"><h2>도메인 상세</h2><label>도메인키<input value={draft.domainKey} disabled={Boolean(selectedKey)} onChange={(event) => setDraft({ ...draft, domainKey: event.target.value })} /></label><label>도메인명<input value={draft.domainName} onChange={(event) => setDraft({ ...draft, domainName: event.target.value })} /></label><label>호환 도메인 코드<input value={draft.domain} onChange={(event) => setDraft({ ...draft, domain: event.target.value })} /></label><label>마지막 분류 단어<select value={draft.domainWordKey} onChange={(event) => setDraft({ ...draft, domainWordKey: event.target.value })}><option value="">선택</option>{domainWords.map((word) => <option key={word.wordKey} value={word.wordKey}>{word.logicalName} ({word.abbreviation})</option>)}</select></label><label>데이터 타입<select value={draft.dataType} onChange={(event) => setDraft({ ...draft, dataType: event.target.value as StandardDomain['dataType'] })}>{['VARCHAR','CHAR','INTEGER','DECIMAL','DATE','DATETIME','JSON'].map((value) => <option key={value}>{value}</option>)}</select></label><div className="metadata-inline-fields"><label>길이<input type="number" value={draft.length ?? ''} onChange={(event) => setDraft({ ...draft, length: event.target.value ? Number(event.target.value) : null })} /></label><label>소수점<input type="number" value={draft.scale ?? ''} onChange={(event) => setDraft({ ...draft, scale: event.target.value ? Number(event.target.value) : null })} /></label></div><label>허용값<input value={draft.allowedValues} onChange={(event) => setDraft({ ...draft, allowedValues: event.target.value })} placeholder="예: Y,N" /></label><label>설명<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>사용 여부<select value={draft.useYn} onChange={(event) => setDraft({ ...draft, useYn: event.target.value as 'Y' | 'N' })}><option value="Y">사용</option><option value="N">미사용</option></select></label><p className="status-message">{message}</p></aside>
    </div></div>;
}
