import { useEffect, useState } from 'react';
import domainsJson from '../../../../meta/domains.json';
import { loadEditableMetadata } from './editableMetadata.repository';
import type { StandardDomain, StandardWord } from './metadataStandard.types';

export default function TermComposer() {
  const [words, setWords] = useState<StandardWord[]>([]);
  const [domains, setDomains] = useState<StandardDomain[]>(domainsJson as StandardDomain[]);
  const [selectedWordKey, setSelectedWordKey] = useState('');
  const [wordKeys, setWordKeys] = useState<string[]>(['USER', 'NAME']);
  useEffect(() => { Promise.all([loadEditableMetadata<StandardWord>('words', [], `${import.meta.env.BASE_URL}data/standard-words-20251101.json`), loadEditableMetadata('domains', domainsJson as StandardDomain[])]).then(([wordData, domainData]) => { setWords(wordData.rows.filter((word) => word.useYn === 'Y' && word.reviewStatus === 'APPROVED')); setDomains(domainData.rows.filter((domain) => domain.useYn === 'Y')); }); }, []);
  const selectedWords = wordKeys.map((key) => words.find((word) => word.wordKey === key)).filter((word): word is StandardWord => Boolean(word));
  const lastWord = selectedWords.at(-1);
  const domain = domains.find((candidate) => candidate.domainWordKey === lastWord?.wordKey);
  const logicalName = selectedWords.map((word) => word.logicalName).join('');
  const physicalName = selectedWords.map((word) => word.abbreviation).join('_');
  const valid = selectedWords.length > 0 && lastWord?.wordType === 'DOMAIN' && Boolean(domain);

  return <section className="term-composer"><div className="term-composer-heading"><div><h2>용어 조합 Prototype</h2><p>검수완료 단어만 조합하며 마지막 단어로 도메인이 자동 결정됩니다.</p></div><button type="button" className="secondary-button" onClick={() => setWordKeys([])}>비우기</button></div>
    <div className="term-composer-control"><select value={selectedWordKey} onChange={(event) => setSelectedWordKey(event.target.value)}><option value="">추가할 단어 선택</option>{words.map((word) => <option key={word.wordKey} value={word.wordKey}>{word.logicalName} · {word.abbreviation} · {word.wordType === 'DOMAIN' ? '도메인' : '일반'}</option>)}</select><button type="button" className="primary-button" disabled={!selectedWordKey} onClick={() => { if (selectedWordKey) setWordKeys((current) => [...current, selectedWordKey]); setSelectedWordKey(''); }}>단어 추가</button></div>
    <div className="term-token-list">{selectedWords.map((word, index) => <button type="button" key={`${word.wordKey}-${index}`} className={word.wordType === 'DOMAIN' ? 'domain-token' : ''} title="클릭하여 제거" onClick={() => setWordKeys((current) => current.filter((_, itemIndex) => itemIndex !== index))}>{word.logicalName}<small>{word.abbreviation}</small></button>)}</div>
    <div className={`term-composer-result ${valid ? 'valid' : 'invalid'}`}><dl><dt>논리 용어명</dt><dd>{logicalName || '-'}</dd><dt>물리 용어명</dt><dd>{physicalName || '-'}</dd><dt>결정 도메인</dt><dd>{domain ? `${domain.domainName} · ${domain.dataType}${domain.length ? `(${domain.length}${domain.scale !== null ? `,${domain.scale}` : ''})` : ''}` : '-'}</dd></dl><strong>{valid ? '생성 가능' : '마지막 단어는 등록된 도메인 단어여야 합니다.'}</strong></div>
  </section>;
}
