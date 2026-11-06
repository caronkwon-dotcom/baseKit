import { normalizeDesign, type DesignBody, type ScreenDesignRecord, type ScreenDesignSummary } from './screenDesign.ts';

/** Screen design on the server (BSDSCRN). The AI draft endpoint returns a validated draft and stores nothing. */
export class ScreenDesignApiError extends Error {
  status: number;
  constructor(status: number, message: string, cause?: unknown) { super(message, cause === undefined ? undefined : { cause }); this.status = status; }
}

export interface AiDraftResult { DESIGN: DesignBody; MODEL: string; PROGRAM_VERSION: number | null; EVIDENCE_COUNT: number; EVIDENCE_USED: number; WARNINGS: string[] }

/** Designs saved before schema version 2 are read with defaults for the fields they lack. */
const record = (value: ScreenDesignRecord | null): ScreenDesignRecord | null => value ? { ...value, DESIGN: normalizeDesign(value.DESIGN) } : null;

const base = (project: string) => `/api/standard-design/projects/${encodeURIComponent(project)}`;
const programBase = (project: string, program: string) => `${base(project)}/programs/${encodeURIComponent(program)}/screen-design`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, init); }
  catch (error) { throw new ScreenDesignApiError(0, '서버에 연결하지 못했습니다. 백엔드 실행 상태를 확인하세요.', error); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { MESSAGE?: string };
    throw new ScreenDesignApiError(response.status, body.MESSAGE || '화면 설계 요청에 실패했습니다.');
  }
  return (await response.json() as { DATA: T }).DATA;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const screenDesignApi = {
  summaries: (project: string) => request<ScreenDesignSummary[]>(`${base(project)}/screen-designs`),
  get: async (project: string, program: string) => record(await request<ScreenDesignRecord | null>(programBase(project, program))),
  save: async (project: string, program: string, design: DesignBody, version?: number) =>
    record(await request<ScreenDesignRecord>(programBase(project, program), json('PUT', version === undefined ? design : { ...design, VERSION: version }))) as ScreenDesignRecord,
  confirm: async (project: string, program: string, version: number) =>
    record(await request<ScreenDesignRecord>(`${programBase(project, program)}/confirm`, json('POST', { VERSION: version }))) as ScreenDesignRecord,
  aiDraft: async (project: string, program: string) => {
    const draft = await request<AiDraftResult>(`${programBase(project, program)}/ai-draft`, json('POST', {}));
    return { ...draft, DESIGN: normalizeDesign(draft.DESIGN), WARNINGS: draft.WARNINGS ?? [] };
  },
};
