import type { GroupMember, GroupStatus } from './requirementGroupApi.ts';
import type { GroupingGroup } from '../projectgrouping/projectGroupingApi.ts';

/** Read-only comparison of the stored AI grouping layers; nothing here is persisted or generated. */
export interface GroupingSource { analysisId: string; draftGroupId: string }

/** Groups registered from AI grouping store `<analysisId>:<draftGroupId>` as REQUEST_ID, which updates never change. */
export function groupingSourceOf(requestId: string | undefined | null): GroupingSource | null {
 const match = /^(PG-[^:\s]+):(\S+)$/.exec(requestId ?? '');
 return match ? { analysisId: match[1], draftGroupId: match[2] } : null;
}

export type DiffOrigin = 'KEPT' | 'ADDED' | 'EXCLUDED' | 'UNKNOWN';
/** REVIEW: decided before registration, AFTER: changed in group management after registration. */
export type DiffStage = 'REVIEW' | 'AFTER' | '';
export interface DiffRow {
 requirementId: string; origin: DiffOrigin; stage: DiffStage;
 inAi: boolean | null; inReviewed: boolean; inFinal: boolean;
 aiReason: string; reviewedReason: string; finalReason: string; reasonChanged: boolean;
}
export interface DiffSummary {
 finalCount: number; kept: number; unknown: number; reasonChanged: number;
 added: { review: number; after: number }; excluded: { review: number; after: number };
}

const reasonOf = (group: GroupingGroup | null, id: string) => group?.MEMBERS.find(member => member.REQUIREMENT_ID === id)?.REASON ?? '';

/** AI baseline may be null (analysis stored before the baseline column existed); then only reviewed-vs-final is known. */
export function compareGroupingResult(
 finalMembers: Pick<GroupMember, 'REQUIREMENT_ID' | 'INCLUSION_REASON'>[], reviewed: GroupingGroup, ai: GroupingGroup | null,
): { rows: DiffRow[]; summary: DiffSummary } {
 const finalReasons = new Map(finalMembers.map(member => [member.REQUIREMENT_ID, member.INCLUSION_REASON]));
 const reviewedIds = new Set(reviewed.MEMBERS.map(member => member.REQUIREMENT_ID));
 const aiIds = ai ? new Set(ai.MEMBERS.map(member => member.REQUIREMENT_ID)) : null;
 const ids = [...new Set([...finalMembers.map(member => member.REQUIREMENT_ID), ...(ai?.MEMBERS ?? []).map(member => member.REQUIREMENT_ID), ...reviewedIds])];
 const summary: DiffSummary = { finalCount: finalMembers.length, kept: 0, unknown: 0, reasonChanged: 0, added: { review: 0, after: 0 }, excluded: { review: 0, after: 0 } };
 const rows = ids.map((requirementId): DiffRow => {
  const inFinal = finalReasons.has(requirementId), inReviewed = reviewedIds.has(requirementId), inAi = aiIds ? aiIds.has(requirementId) : null;
  let origin: DiffOrigin, stage: DiffStage = '';
  if (aiIds) {
   origin = inFinal ? (inAi ? 'KEPT' : 'ADDED') : 'EXCLUDED';
   if (origin === 'ADDED') stage = inReviewed ? 'REVIEW' : 'AFTER';
   if (origin === 'EXCLUDED') stage = inAi && !inReviewed ? 'REVIEW' : 'AFTER';
  } else if (inFinal && !inReviewed) { origin = 'ADDED'; stage = 'AFTER'; }
  else if (!inFinal && inReviewed) { origin = 'EXCLUDED'; stage = 'AFTER'; }
  else origin = 'UNKNOWN';
  const finalReason = finalReasons.get(requirementId) ?? '', reviewedReason = reasonOf(reviewed, requirementId);
  const reasonChanged = inFinal && inReviewed && finalReason.trim() !== reviewedReason.trim();
  if (origin === 'KEPT') summary.kept++;
  else if (origin === 'UNKNOWN') summary.unknown++;
  else summary[origin === 'ADDED' ? 'added' : 'excluded'][stage === 'REVIEW' ? 'review' : 'after']++;
  if (reasonChanged) summary.reasonChanged++;
  return { requirementId, origin, stage, inAi, inReviewed, inFinal, aiReason: reasonOf(ai, requirementId), reviewedReason, finalReason, reasonChanged };
 });
 return { rows, summary };
}

export type NoticeLevel = 'info' | 'warn' | 'error';
export interface GroupingNotice { level: NoticeLevel; text: string }
export interface GroupingNoticeInput {
 source: GroupingSource | null;
 /** NONE: nothing requested, LOADING: request in flight, ERROR: request failed, READY: response received. */
 load: 'NONE' | 'LOADING' | 'ERROR' | 'READY';
 linked: boolean; hasReviewed: boolean; hasAi: boolean;
 /** The run stores an AI baseline, but this group is not part of it (created by a person during review). */
 humanCreated?: boolean;
 groupStatus: GroupStatus; revisionMismatch: number; discarded: number;
}

/** Explains missing evidence and mismatches; never substitutes data that is not stored. */
export function groupingNotices(input: GroupingNoticeInput): GroupingNotice[] {
 const notices: GroupingNotice[] = [];
 if (input.groupStatus === 'DRAFT') notices.push({ level: 'warn', text: '작성중인 그룹입니다. 확정 전 구성이며 확정 버전이 없습니다.' });
 if (input.groupStatus === 'REVIEW_REQUIRED') notices.push({ level: 'warn', text: '요구사항 변경으로 재검토가 필요합니다. 재확정 전까지 확정 구성과 일치하지 않을 수 있습니다.' });
 if (input.revisionMismatch > 0) notices.push({ level: 'warn', text: `${input.revisionMismatch}건의 요구사항이 검토 당시와 다른 개정입니다.` });
 if (input.discarded > 0) notices.push({ level: 'warn', text: `${input.discarded}건의 폐기된 요구사항이 포함되어 있습니다.` });
 if (!input.source) notices.push({ level: 'info', text: 'AI 그룹핑으로 등록된 그룹이 아니므로 AI 추천 근거가 없습니다. 최종 구성만 표시합니다.' });
 else if (input.load === 'LOADING') notices.push({ level: 'info', text: 'AI 그룹핑 분석 결과를 조회하는 중입니다.' });
 else if (input.load === 'ERROR') notices.push({ level: 'error', text: 'AI 그룹핑 분석 결과를 조회하지 못했습니다. AI 추천 근거는 표시하지 않습니다.' });
 else if (input.load === 'READY') {
  if (!input.linked) notices.push({ level: 'warn', text: '분석 이력에서 이 그룹의 등록 연결을 확인하지 못했습니다. AI 추천 근거를 표시하지 않습니다.' });
  else if (!input.hasReviewed) notices.push({ level: 'warn', text: '등록 당시의 검토본을 찾지 못했습니다. AI 추천과의 비교를 표시하지 않습니다.' });
  else if (input.humanCreated) notices.push({ level: 'info', text: 'AI 최초 추천에 없던 그룹입니다(검토 중 사람이 만든 그룹). 등록 시점 검토본 대비 변경만 표시합니다.' });
  else if (!input.hasAi) notices.push({ level: 'info', text: 'AI 최초 추천 원본이 저장되어 있지 않습니다(이전 분석). 등록 시점 검토본 대비 변경만 표시합니다.' });
 }
 return notices;
}

/** Card badge: only claims an origin when the AI baseline or the reviewed copy proves it. */
export function memberBadge(row: Pick<DiffRow, 'origin'> | undefined): string {
 if (row?.origin === 'KEPT') return 'AI 추천';
 if (row?.origin === 'ADDED') return '직접 추가';
 return '';
}
