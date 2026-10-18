export interface GroupingMember { REQUIREMENT_ID: string; REASON: string }
export interface GroupingGroup { GROUP_ID: string; TITLE: string; REASON: string; REVIEW_STATUS: 'DRAFT' | 'APPROVED' | 'HOLD'; MEMBERS: GroupingMember[] }
export interface GroupingDraft { GROUPS: GroupingGroup[]; UNCLASSIFIED: GroupingMember[] }
export interface GroupingInput { REQUIREMENT_ID: string; REQUIREMENT_NAME: string; REQUIREMENT_REVISION: number }
export interface GroupingRun { ANALYSIS_ID: string; STATUS: string; VERSION: number; CREATED_AT: string; DEADLINE_AT: string; ERROR_MESSAGE?: string; INPUT: GroupingInput[]; DRAFT: GroupingDraft | null; REGISTERED: { DRAFT_GROUP_ID: string; REQUIREMENT_GROUP_ID: string }[] }
export interface GroupingHistory { ANALYSIS_ID: string; STATUS: string; CREATED_AT: string }
async function request<T>(project: string, path = '', method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/standard-design/projects/${encodeURIComponent(project)}/grouping${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.json().catch(() => ({})) as { DATA: T; MESSAGE?: string };
  if (!response.ok) throw new Error(result.MESSAGE || '그룹핑 요청을 완료하지 못했습니다. 다시 조회해 주세요.');
  return result.DATA;
}
export const projectGroupingApi = {
  history: (project: string) => request<GroupingHistory[]>(project),
  get: (project: string, id: string) => request<GroupingRun>(project, `/${id}`),
  start: (project: string, requestId: string) => request<GroupingRun>(project, '', 'POST', { REQUEST_ID: requestId }),
  save: (project: string, run: GroupingRun, draft: GroupingDraft) => request<GroupingRun>(project, `/${run.ANALYSIS_ID}`, 'PUT', { VERSION: run.VERSION, DRAFT: draft }),
  register: (project: string, run: GroupingRun, ids: string[]) => request<GroupingRun>(project, `/${run.ANALYSIS_ID}/register`, 'POST', { VERSION: run.VERSION, GROUP_IDS: ids }),
};
// Preserve every input ID when editing N:M membership.
export function reconcileDraft(draft: GroupingDraft, input: GroupingInput[]): GroupingDraft {
  const covered = new Set(draft.GROUPS.flatMap(g => g.MEMBERS.map(m => m.REQUIREMENT_ID)));
  const previous = new Map(draft.UNCLASSIFIED.map(m => [m.REQUIREMENT_ID, m]));
  return { ...draft, UNCLASSIFIED: input.filter(r => !covered.has(r.REQUIREMENT_ID)).map(r => previous.get(r.REQUIREMENT_ID) ?? { REQUIREMENT_ID: r.REQUIREMENT_ID, REASON: '검토 중 그룹에서 제외되었습니다.' }) };
}
