export type DocumentNumberRule = {
  RULE_KEY: string; RULE_VERSION: number; RULE_NAME: string; PREFIX: string; DATE_FORMAT: 'NONE' | 'YYYY' | 'YYYYMM';
  SEQUENCE_LENGTH: number; START_VALUE: number; INCREMENT_VALUE: number; RESET_CYCLE: 'NONE' | 'YEAR' | 'MONTH';
  SCOPE_TYPE: 'GLOBAL' | 'MODULE' | 'PROJECT'; USE_YN: 'Y' | 'N'; DESCRIPTION: string | null; CURRENT_VALUE: number;
  REG_DT: string; REG_BY: string; MOD_DT: string; MOD_BY: string;
};
export type DocumentNumberIssue = {
  ISSUE_ID: string; RULE_KEY: string; RULE_VERSION: number; SCOPE_KEY: string; PERIOD_KEY: string;
  SEQUENCE_VALUE: number; DOCUMENT_NUMBER: string; IDEMPOTENCY_KEY: string; ISSUE_STATUS: string;
  BUSINESS_REF: string | null; REG_DT: string; MOD_DT: string;
};
export type RuleSave = Omit<DocumentNumberRule, 'RULE_VERSION' | 'CURRENT_VALUE' | 'REG_DT' | 'REG_BY' | 'MOD_DT' | 'MOD_BY'>;
type Envelope<T> = { DATA: T };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/document-number-rules${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { MESSAGE?: string; FIELD_ERRORS?: { FIELD_NAME: string; MESSAGE: string }[] };
    const fields = error.FIELD_ERRORS?.map((item) => `${item.FIELD_NAME}: ${item.MESSAGE}`).join(', ');
    throw new Error(fields || error.MESSAGE || '채번관리 요청을 처리하지 못했습니다.');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json() as Envelope<T>).DATA;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const documentNumberApi = {
  list: (keyword = '') => request<DocumentNumberRule[]>(`?KEYWORD=${encodeURIComponent(keyword)}`),
  detail: (key: string, version?: number) => request<DocumentNumberRule>(`/${encodeURIComponent(key)}${version ? `?RULE_VERSION=${version}` : ''}`),
  create: (value: RuleSave) => request<DocumentNumberRule>('', json('POST', value)),
  update: (value: RuleSave, version: number) => request<DocumentNumberRule>(`/${encodeURIComponent(value.RULE_KEY)}/${version}`, json('PUT', value)),
  usage: (key: string, version: number, useYn: 'Y' | 'N') => request<DocumentNumberRule>(`/${encodeURIComponent(key)}/${version}/usage?USE_YN=${useYn}`, { method: 'PATCH' }),
  preview: (key: string, version: number | undefined, scopeKey: string, draft?: RuleSave) => request<{ DOCUMENT_NUMBER: string; PERIOD_KEY: string; CONSUMES_NUMBER: boolean }>('/preview', json('POST', { RULE_KEY: key, RULE_VERSION: version, SCOPE_KEY: scopeKey, DRAFT_RULE: draft })),
  history: (key: string, version: number) => request<DocumentNumberIssue[]>(`/${encodeURIComponent(key)}/${version}/issues?LIMIT=100`),
};
