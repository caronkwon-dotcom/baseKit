import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function parseCsv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); value = ''; if (row.some(Boolean)) rows.push(row); row = [];
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [header, ...data] = rows;
  return data.map((columns) => Object.fromEntries(header.map((name, index) => [name.replace(/^\uFEFF/, ''), columns[index] ?? ''])));
}

const root = process.cwd();
const wordCsvPath = process.argv[2];
const termCsvPath = process.argv[3];
if (!wordCsvPath || !termCsvPath) throw new Error('단어 CSV와 용어 CSV 경로가 필요합니다.');

const existing = JSON.parse(await readFile(path.join(root, 'meta/words.json'), 'utf8'));
const existingApproval = new Map(existing.filter((word) => word.reviewStatus === 'APPROVED').map((word) => [`${word.logicalName}::${word.abbreviation}`, word]));
const sourceWords = parseCsv(await readFile(wordCsvPath, 'utf8'));
const abbreviationCount = new Map();
sourceWords.forEach((row) => abbreviationCount.set(row['공통표준단어영문약어명'], (abbreviationCount.get(row['공통표준단어영문약어명']) ?? 0) + 1));

const words = sourceWords.map((row, index) => {
  const abbreviation = row['공통표준단어영문약어명'];
  const logicalName = row['공통표준단어명'];
  const prior = existingApproval.get(`${logicalName}::${abbreviation}`);
  const retired = Boolean(row['개정구분명(폐기 또는 변경)']);
  return {
    wordKey: abbreviationCount.get(abbreviation) === 1 && abbreviation ? abbreviation : `${abbreviation || 'NO_ABBR'}_${index + 1}`,
    logicalName,
    englishName: row['공통표준단어 영문명'],
    abbreviation,
    wordType: row['형식단어여부'] === 'Y' ? 'DOMAIN' : 'GENERAL',
    description: row['공통표준단어 설명'],
    useYn: retired ? 'N' : 'Y',
    reviewStatus: retired ? 'RETIRED' : prior ? 'APPROVED' : 'IMPORTED',
    synonymList: row['이음동의어 목록'],
    forbiddenWordList: row['금칙어 목록'],
    domainCategory: row['공통표준도메인분류명'],
    revision: row['제정차수'],
    source: 'MOIS',
  };
});

const activeWordByAbbreviation = new Map(words.filter((word) => word.useYn === 'Y').map((word) => [word.abbreviation, word]));
const terms = parseCsv(await readFile(termCsvPath, 'utf8'));
const decomposition = terms.map((term, index) => {
  const tokens = term['공통표준용어영문약어명'].split('_').filter(Boolean);
  const matchedWords = tokens.map((token) => activeWordByAbbreviation.get(token));
  const unmatchedTokens = tokens.filter((_, tokenIndex) => !matchedWords[tokenIndex]);
  return {
    termId: index + 1,
    logicalName: term['공통표준용어명'],
    physicalName: term['공통표준용어영문약어명'],
    domainName: term['공통표준도메인명'],
    wordKeys: matchedWords.filter(Boolean).map((word) => word.wordKey),
    unmatchedTokens,
    decompositionStatus: unmatchedTokens.length ? 'UNMATCHED' : 'MATCHED',
  };
});

await writeFile(path.join(root, 'meta/words.json'), `${JSON.stringify(words, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, 'public/data/standard-words-20251101.json'), `${JSON.stringify(words)}\n`, 'utf8');
await writeFile(path.join(root, 'public/data/term-word-decomposition-20251101.json'), `${JSON.stringify(decomposition)}\n`, 'utf8');
const matched = decomposition.filter((term) => term.decompositionStatus === 'MATCHED').length;
console.log(JSON.stringify({ words: words.length, approved: words.filter((word) => word.reviewStatus === 'APPROVED').length, retired: words.filter((word) => word.reviewStatus === 'RETIRED').length, terms: decomposition.length, matched, unmatched: decomposition.length - matched }, null, 2));
