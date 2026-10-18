export interface GroupingMember { REQUIREMENT_ID: string; REASON: string }
export interface GroupingGroup { GROUP_ID: string; TITLE: string; REASON: string; REVIEW_STATUS: 'DRAFT' | 'APPROVED' | 'HOLD'; MEMBERS: GroupingMember[] }
export interface GroupingDraft { GROUPS: GroupingGroup[]; UNCLASSIFIED: GroupingMember[] }
export interface GroupingInput { REQUIREMENT_ID: string; REQUIREMENT_NAME: string; REQUIREMENT_REVISION: number }
export interface GroupingRun { ANALYSIS_ID: string; STATUS: string; VERSION: number; CREATED_AT: string; DEADLINE_AT: string; ERROR_MESSAGE?: string; INPUT: GroupingInput[]; DRAFT: GroupingDraft | null; AI_DRAFT?: GroupingDraft | null; REGISTERED: { DRAFT_GROUP_ID: string; REQUIREMENT_GROUP_ID: string }[] }
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


export type ComparedGroup = {
  status: 'UNCHANGED' | 'UPDATED' | 'ADDED' | 'REMOVED';
  left: GroupingGroup | null;
  right: GroupingGroup | null;
  addedIds: string[];
  removedIds: string[];
  changedMemberReasons: string[];
  titleChanged: boolean;
  reasonChanged: boolean;
};
export interface GroupingComparison {
  groups: ComparedGroup[];
  addedUnclassified: GroupingMember[];
  removedUnclassified: GroupingMember[];
}

/** Compare immutable AI snapshots; match renamed groups by shared stable requirement IDs. */
export function compareGroupingRuns(leftRun: GroupingRun, rightRun: GroupingRun): GroupingComparison {
  const left = leftRun.AI_DRAFT ?? leftRun.DRAFT;
  const right = rightRun.AI_DRAFT ?? rightRun.DRAFT;
  if (!left || !right) throw new Error('비교할 수 있는 분석 결과가 없습니다.');
  const available = new Set(right.GROUPS.map((_, index) => index));
  const matches: Array<[number, number]> = [];
  const ids = (group: GroupingGroup) => new Set(group.MEMBERS.map(member => member.REQUIREMENT_ID));
  left.GROUPS.forEach((group, leftIndex) => {
    const title = group.TITLE.trim().toLocaleLowerCase();
    let rightIndex = [...available].find(index => right.GROUPS[index].TITLE.trim().toLocaleLowerCase() === title);
    if (rightIndex === undefined) {
      let largest = 0;
      for (const index of available) {
        const members = ids(right.GROUPS[index]);
        const overlap = [...ids(group)].filter(id => members.has(id)).length;
        if (overlap > largest) { largest = overlap; rightIndex = index; }
      }
    }
    if (rightIndex !== undefined) { available.delete(rightIndex); matches.push([leftIndex, rightIndex]); }
  });
  const compared: ComparedGroup[] = matches.map(([leftIndex, rightIndex]) => {
    const oldGroup = left.GROUPS[leftIndex]; const newGroup = right.GROUPS[rightIndex];
    const oldIds = ids(oldGroup); const newIds = ids(newGroup);
    const oldMembers = new Map(oldGroup.MEMBERS.map(member => [member.REQUIREMENT_ID, member]));
    const newMembers = new Map(newGroup.MEMBERS.map(member => [member.REQUIREMENT_ID, member]));
    const addedIds = [...newIds].filter(id => !oldIds.has(id));
    const removedIds = [...oldIds].filter(id => !newIds.has(id));
    const changedMemberReasons = [...oldIds].filter(id => newIds.has(id) && oldMembers.get(id)?.REASON !== newMembers.get(id)?.REASON);
    const titleChanged = oldGroup.TITLE !== newGroup.TITLE;
    const reasonChanged = oldGroup.REASON !== newGroup.REASON;
    const status = titleChanged || reasonChanged || addedIds.length > 0 || removedIds.length > 0 || changedMemberReasons.length > 0 ? 'UPDATED' : 'UNCHANGED';
    return { status, left: oldGroup, right: newGroup, addedIds, removedIds, changedMemberReasons, titleChanged, reasonChanged };
  });
  for (const index of available) compared.push({ status: 'ADDED', left: null, right: right.GROUPS[index], addedIds: [], removedIds: [], changedMemberReasons: [], titleChanged: false, reasonChanged: false });
  const matchedLeft = new Set(matches.map(([index]) => index));
  left.GROUPS.forEach((group, index) => { if (!matchedLeft.has(index)) compared.push({ status: 'REMOVED', left: group, right: null, addedIds: [], removedIds: [], changedMemberReasons: [], titleChanged: false, reasonChanged: false }); });
  const leftUnclassified = new Map(left.UNCLASSIFIED.map(member => [member.REQUIREMENT_ID, member]));
  const rightUnclassified = new Map(right.UNCLASSIFIED.map(member => [member.REQUIREMENT_ID, member]));
  return {
    groups: compared,
    addedUnclassified: [...rightUnclassified].filter(([id]) => !leftUnclassified.has(id)).map(([, member]) => member),
    removedUnclassified: [...leftUnclassified].filter(([id]) => !rightUnclassified.has(id)).map(([, member]) => member),
  };
}
