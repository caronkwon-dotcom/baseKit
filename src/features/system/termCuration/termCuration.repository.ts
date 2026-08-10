import type { StandardTerm, TermCurationDocument } from './termCuration.types';

const STORAGE_KEY = 'basekit.term-curation.v1';
const EMPTY_DOCUMENT: TermCurationDocument = { version: 1, updatedAt: null, reviews: {} };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); value = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

export async function loadStandardTerms(): Promise<StandardTerm[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/common-standard-terms-20251101.csv`);
  if (!response.ok) throw new Error('공공표준용어 원본을 불러오지 못했습니다.');
  const [, ...rows] = parseCsv(await response.text());
  return rows.map((columns, index) => ({
    id: `${columns[0]}::${columns[2]}::${index + 1}`,
    logicalName: columns[0] ?? '', description: columns[1] ?? '', abbreviation: columns[2] ?? '',
    domainName: columns[3] ?? '', allowedValues: columns[4] ?? '', storageFormat: columns[5] ?? '',
    displayFormat: columns[6] ?? '', synonymList: columns[9] ?? '', revision: columns[10] ?? '',
    revisionType: columns[11] ?? '',
  }));
}

export async function loadCuration(): Promise<{ document: TermCurationDocument; mode: 'FILE' | 'BROWSER' }> {
  try {
    const response = await fetch('/api/term-curation');
    if (response.ok) return { document: await response.json() as TermCurationDocument, mode: 'FILE' };
  } catch { /* GitHub Pages에서는 로컬 저장소를 사용한다. */ }
  const saved = localStorage.getItem(STORAGE_KEY);
  return { document: saved ? JSON.parse(saved) as TermCurationDocument : EMPTY_DOCUMENT, mode: 'BROWSER' };
}

export async function saveCuration(document: TermCurationDocument, mode: 'FILE' | 'BROWSER') {
  if (mode === 'FILE') {
    const response = await fetch('/api/term-curation', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document),
    });
    if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? '저장하지 못했습니다.');
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}

export function downloadCuration(curation: TermCurationDocument) {
  const blob = new Blob([`${JSON.stringify(curation, null, 2)}\n`], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'term-curation.json';
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
