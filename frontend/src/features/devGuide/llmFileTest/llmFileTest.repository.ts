export interface LlmFileCapability { FEATURE: string; STATUS: string; DETAIL: string }
export interface LlmFileInfo {
  FILE_ID: string; PROJECT_ID: string; FILE_NAME: string; FILE_SIZE_BYTES: number; CHUNK_COUNT: number;
  STATUS: string; STORAGE: string; USE_COUNT: number; REGISTERED_AT: string;
}
export interface LlmFileHit { POSITION: string; TEXT: string; SCORE: number }
export interface LlmFileSearchResult { METHOD: string; FILE_REUSED: boolean; ELAPSED_MS: number; REQUEST_BYTES: number; HITS: LlmFileHit[] }
export interface LlmFileQueryResult {
  METHOD: string; SOURCE: string; MODEL: string; ANSWER: string; ELAPSED_MS: number; REQUEST_BYTES: number;
  FILE_SIZE_BYTES: number; FULL_FILE_SENT: boolean; FILE_REUSED: boolean; HITS: LlmFileHit[];
}

const BASE = '/api/dev-guide/v1/llm-files';

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { DATA?: T; MESSAGE?: string };
  if (!response.ok) throw new Error(payload.MESSAGE ?? `요청에 실패했습니다. (HTTP ${response.status})`);
  return payload.DATA as T;
}

const postJson = (path: string, body: unknown) => fetch(`${BASE}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export const fetchCapabilities = () => fetch(`${BASE}/capabilities`).then((r) => unwrap<LlmFileCapability[]>(r));
export const fetchFiles = (projectId: string) => fetch(`${BASE}/files?PROJECT_ID=${encodeURIComponent(projectId)}`).then((r) => unwrap<LlmFileInfo[]>(r));
export const uploadFile = async (projectId: string, original: File) => {
  let file = original;
  if (/\.xlsx?$/i.test(original.name)) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await original.arrayBuffer(), { type: 'array' });
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
    file = new File([csv], original.name.replace(/\.xlsx?$/i, '.csv'), { type: 'text/csv' });
  }
  const form = new FormData();
  form.append('PROJECT_ID', projectId);
  form.append('FILE', file);
  return fetch(`${BASE}/files`, { method: 'POST', body: form }).then((r) => unwrap<LlmFileInfo>(r));
};
export const searchFile = (projectId: string, fileId: string, question: string, topK: number) =>
  postJson('/search', { PROJECT_ID: projectId, FILE_ID: fileId, QUESTION: question, TOP_K: topK }).then((r) => unwrap<LlmFileSearchResult>(r));
export const queryFile = (projectId: string, fileId: string, question: string, topK: number, mode: 'RETRIEVAL' | 'FULL_FILE') =>
  postJson('/query', { PROJECT_ID: projectId, FILE_ID: fileId, QUESTION: question, TOP_K: topK, MODE: mode }).then((r) => unwrap<LlmFileQueryResult>(r));
