export type AnalysisStatus = 'INPUT_READY' | 'ANALYZING' | 'REVIEW_READY' | 'ANALYSIS_FAILED' | 'ANALYSIS_UNKNOWN' | 'STALE' | 'CONFIRMED'
  | 'GENERATING' | 'GENERATED' | 'PARTIAL' | 'GENERATION_FAILED' | 'GENERATION_UNKNOWN';

export interface NamedItem { TEMP_ID: string; NAME: string }
export interface CandidateBody {
  TEMP_ID?: string;
  PROGRAM_NAME: string;
  PURPOSE: string;
  SOURCE_REQUIREMENT_IDS: string[];
  MENU_TEMP_IDS?: string[];
  ROLE_TEMP_IDS?: string[];
  ACTION_TEMP_IDS?: string[];
  STEP_TEMP_IDS?: string[];
  LAYOUT_TYPE?: string;
  MENU_MAPPINGS?: Record<string, string>;
}
export interface CandidateIssue { LEVEL: 'BLOCK' | 'WARN'; CODE: string; MESSAGE: string }
export interface AnalysisCandidate {
  CANDIDATE_ID: string;
  TEMP_ID: string;
  ORIGINAL: CandidateBody;
  EDITED: CandidateBody | null;
  EFFECTIVE: CandidateBody;
  SELECTED_YN: 'Y' | 'N';
  CONFIRMED_YN: 'Y' | 'N';
  GENERATED_YN: 'Y' | 'N';
  GENERATED_PROGRAM_ID: string | null;
  ISSUES: CandidateIssue[];
}
export interface AnalysisResult {
  ANALYSIS_SUMMARY: { TITLE: string; SUMMARY: string; SOURCE_REQUIREMENT_IDS: string[]; KEY_POINTS?: string[]; ASSUMPTIONS?: string[]; UNRESOLVED_ITEMS?: string[] };
  BUSINESS_STRUCTURE: { MENUS: NamedItem[]; ROLES: NamedItem[]; ACTIONS: NamedItem[] };
  PROCESS_MODEL: { STEPS: NamedItem[]; TRANSITIONS: { FROM: string; TO: string }[] };
  LAYOUT_RECOMMENDATION: { LAYOUT_TYPE: string; COMPONENTS?: string[]; REASON?: string };
}
export interface Analysis {
  ANALYSIS_ID: string;
  PROJECT_ID: string;
  REQUEST_ID: string;
  INPUT_VERSION: string;
  RESULT_VERSION: number;
  ANALYSIS_STATUS: AnalysisStatus;
  OVERALL_OPINION: string | null;
  ERROR_CODE: string | null;
  ERROR_MESSAGE: string | null;
  REQUIREMENTS: { REQUIREMENT_ID: string; REQUIREMENT_NAME: string; MOD_DT: string; DESIGN_OPINION: string | null }[];
  RESULT: AnalysisResult | null;
  CANDIDATES: AnalysisCandidate[];
}
export interface AnalysisSummary { ANALYSIS_ID: string; REQUEST_ID: string; ANALYSIS_STATUS: AnalysisStatus; RESULT_VERSION: number }
export interface GenerationItem { CANDIDATE_ID: string; PROGRAM_NAME: string; STATUS: 'PENDING' | 'SUCCESS' | 'FAILED'; PROGRAM_ID: string | null; ERROR_CODE: string | null; ERROR_MESSAGE: string | null }
export interface Generation { ANALYSIS_ID: string; ANALYSIS_STATUS: AnalysisStatus; GENERATION_REQUEST_ID: string | null; STATUS?: string; ITEMS: GenerationItem[] }
export interface AnalysisInput {
  REQUIREMENTS: { REQUIREMENT_ID: string; MOD_DT: string; DESIGN_OPINION: string }[];
  OVERALL_OPINION: string;
}

export class AnalysisApiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

const base = '/api/standard-design/analyses';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { ERROR_CODE?: string; MESSAGE?: string };
    throw new AnalysisApiError(error.ERROR_CODE ?? 'UNKNOWN', error.MESSAGE || '분석 요청을 처리하지 못했습니다.');
  }
  return (await response.json() as { DATA: T }).DATA;
}
const body = (method: string, value: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

export const analysisApi = {
  list: (projectId: string) => request<AnalysisSummary[]>(`?PROJECT_ID=${encodeURIComponent(projectId)}`),
  create: (projectId: string, requestId: string, input: AnalysisInput) => request<Analysis>('', body('POST', { PROJECT_ID: projectId, REQUEST_ID: requestId, ...input })),
  get: (id: string) => request<Analysis>(`/${encodeURIComponent(id)}`),
  checkInput: (id: string, input: AnalysisInput) => request<Analysis>(`/${encodeURIComponent(id)}/input`, body('PUT', input)),
  reanalyze: (id: string, input: AnalysisInput) => request<Analysis>(`/${encodeURIComponent(id)}/reanalyze`, body('POST', input)),
  updateCandidate: (id: string, candidateId: string, value: { RESULT_VERSION: number; EDITED?: CandidateBody; SELECTED?: boolean; RESET?: boolean }) =>
    request<Analysis>(`/${encodeURIComponent(id)}/candidates/${encodeURIComponent(candidateId)}`, body('PUT', value)),
  confirm: (id: string, resultVersion: number, candidateIds: string[], input: AnalysisInput) => request<Analysis>(`/${encodeURIComponent(id)}/confirm`, body('POST', { RESULT_VERSION: resultVersion, CANDIDATE_IDS: candidateIds, INPUT: input })),
  generate: (id: string, generationRequestId: string, resultVersion: number, input: AnalysisInput) => request<Generation>(`/${encodeURIComponent(id)}/generate`, body('POST', { GENERATION_REQUEST_ID: generationRequestId, RESULT_VERSION: resultVersion, INPUT: input })),
  generation: (id: string) => request<Generation>(`/${encodeURIComponent(id)}/generation`),
};

export const analysisSteps = ['요구사항 준비', '분석', '결과 검토', '확정·생성'] as const;

/** Maps the analysis state to the 4-step UX. ANALYZING/FAILED/UNKNOWN stay inside step 2. */
export function stepOf(status: AnalysisStatus | null): number {
  if (!status || status === 'INPUT_READY') return 0;
  if (status === 'ANALYZING' || status === 'ANALYSIS_FAILED' || status === 'ANALYSIS_UNKNOWN') return 1;
  if (status === 'REVIEW_READY' || status === 'STALE') return 2;
  return 3;
}

export const statusLabels: Record<AnalysisStatus, string> = {
  INPUT_READY: '입력 준비', ANALYZING: '분석 중', REVIEW_READY: '검토 대기', ANALYSIS_FAILED: '분석 실패', ANALYSIS_UNKNOWN: '분석 결과 불명',
  STALE: '재분석 필요', CONFIRMED: '확정됨', GENERATING: '생성 중', GENERATED: '생성 완료', PARTIAL: '일부 생성', GENERATION_FAILED: '생성 실패', GENERATION_UNKNOWN: '생성 결과 불명',
};

export const canEdit = (status: AnalysisStatus) => status === 'REVIEW_READY' || status === 'CONFIRMED';
export const needsReanalysis = (status: AnalysisStatus) => status === 'STALE' || status === 'ANALYSIS_FAILED' || status === 'ANALYSIS_UNKNOWN';
export const isRunning = (status: AnalysisStatus) => status === 'ANALYZING' || status === 'GENERATING';
export const hasBlock = (candidate: AnalysisCandidate) => candidate.ISSUES.some((issue) => issue.LEVEL === 'BLOCK');

/** A polled response may only update the screen when it belongs to the current project and analysis. */
export function acceptsResponse(current: { projectId: string; analysisId: string }, response: Pick<Analysis, 'PROJECT_ID' | 'ANALYSIS_ID'>): boolean {
  return current.projectId === response.PROJECT_ID && current.analysisId === response.ANALYSIS_ID;
}

export function buildInput(rows: { REQUIREMENT_ID: string; MOD_DT: string }[], selectedIds: string[], opinions: Record<string, string>, overall: string): AnalysisInput {
  const picked = new Set(selectedIds);
  return {
    REQUIREMENTS: rows.filter((row) => picked.has(row.REQUIREMENT_ID)).map((row) => ({ REQUIREMENT_ID: row.REQUIREMENT_ID, MOD_DT: row.MOD_DT, DESIGN_OPINION: opinions[row.REQUIREMENT_ID] ?? '' })),
    OVERALL_OPINION: overall,
  };
}

/** Canonical comparison matching the server's STALE decision inputs (ids, MOD_DT, opinions, overall opinion). */
export function inputSignature(input: AnalysisInput): string {
  const sorted = [...input.REQUIREMENTS].sort((a, b) => a.REQUIREMENT_ID.localeCompare(b.REQUIREMENT_ID));
  return JSON.stringify([sorted.map((r) => [r.REQUIREMENT_ID, new Date(r.MOD_DT).getTime(), r.DESIGN_OPINION.trim()]), input.OVERALL_OPINION.trim()]);
}

export function summarizeGeneration(items: GenerationItem[]): { success: number; failed: number; pending: number } {
  return { success: items.filter((i) => i.STATUS === 'SUCCESS').length, failed: items.filter((i) => i.STATUS === 'FAILED').length, pending: items.filter((i) => i.STATUS === 'PENDING').length };
}

const staleChecked: AnalysisStatus[] = ['REVIEW_READY', 'CONFIRMED', 'PARTIAL', 'GENERATION_FAILED'];

/** Input of the analysis as stored on the server; the baseline for the immediate local STALE decision. */
export function baselineInput(analysis: Pick<Analysis, 'REQUIREMENTS' | 'OVERALL_OPINION'>): AnalysisInput {
  return {
    REQUIREMENTS: analysis.REQUIREMENTS.map((r) => ({ REQUIREMENT_ID: r.REQUIREMENT_ID, MOD_DT: r.MOD_DT, DESIGN_OPINION: r.DESIGN_OPINION ?? '' })),
    OVERALL_OPINION: analysis.OVERALL_OPINION ?? '',
  };
}

/** Immediate STALE: any difference from the analysed input (including an empty selection) invalidates the result. */
export function isLocallyStale(analysis: Pick<Analysis, 'ANALYSIS_STATUS' | 'REQUIREMENTS' | 'OVERALL_OPINION'>, current: AnalysisInput): boolean {
  if (analysis.ANALYSIS_STATUS === 'STALE') return true;
  if (!staleChecked.includes(analysis.ANALYSIS_STATUS)) return false;
  return current.REQUIREMENTS.length === 0 || inputSignature(baselineInput(analysis)) !== inputSignature(current);
}

/** Reuse the GENERATION_REQUEST_ID only for retrying after a server-confirmed partial/failed generation. */
export function retryRequestId(generation: Generation | null, current: { ANALYSIS_STATUS: AnalysisStatus }): string | null {
  if (!generation?.GENERATION_REQUEST_ID) return null;
  if (current.ANALYSIS_STATUS !== 'PARTIAL' && current.ANALYSIS_STATUS !== 'GENERATION_FAILED') return null;
  return generation.GENERATION_REQUEST_ID;
}

export interface CandidateDiffRow { label: string; original: string; edited: string; changed: boolean }
export type RelationKind = 'MENU' | 'ROLE' | 'ACTION' | 'STEP';

/** Original vs edited comparison of every editable candidate attribute (name, purpose, layout, relations, sources). */
export function candidateDiff(candidate: Pick<AnalysisCandidate, 'ORIGINAL' | 'EFFECTIVE'>, nameOf: (kind: RelationKind, tempId: string) => string = (_k, id) => id): CandidateDiffRow[] {
  const list = (kind: RelationKind, ids?: string[]) => (ids ?? []).map((id) => nameOf(kind, id)).join(', ') || '-';
  const text = (v?: string) => (v && v.trim()) || '-';
  const o = candidate.ORIGINAL, e = candidate.EFFECTIVE;
  const rows: [string, string, string][] = [
    ['프로그램명', text(o.PROGRAM_NAME), text(e.PROGRAM_NAME)],
    ['목적', text(o.PURPOSE), text(e.PURPOSE)],
    ['Layout', text(o.LAYOUT_TYPE), text(e.LAYOUT_TYPE)],
    ['출처 Requirement', (o.SOURCE_REQUIREMENT_IDS ?? []).join(', ') || '-', (e.SOURCE_REQUIREMENT_IDS ?? []).join(', ') || '-'],
    ['Menu 관계', list('MENU', o.MENU_TEMP_IDS), list('MENU', e.MENU_TEMP_IDS)],
    ['Role 관계', list('ROLE', o.ROLE_TEMP_IDS), list('ROLE', e.ROLE_TEMP_IDS)],
    ['Action 관계', list('ACTION', o.ACTION_TEMP_IDS), list('ACTION', e.ACTION_TEMP_IDS)],
    ['Step 관계', list('STEP', o.STEP_TEMP_IDS), list('STEP', e.STEP_TEMP_IDS)],
  ];
  return rows.map(([label, original, edited]) => ({ label, original, edited, changed: original !== edited }));
}