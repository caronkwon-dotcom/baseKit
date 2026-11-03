import type { GroupAnalysis } from './groupAnalysis.types.ts';
import type { GroupStatus } from './requirementGroupApi.ts';

/** Derives step state from existing group/analysis data only; nothing here is persisted or sent to the server. */
export type GroupStep = 1 | 2 | 3;
export type GroupStepStatus = 'UNKNOWN' | 'DISABLED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'REVIEW_REQUIRED' | 'FAILED';
export type GroupStepAnalysisType = 'GROUP_RECOMMENDATION' | 'GROUP_DESIGN' | 'GROUP_PROGRAMS';

export interface GroupStepInput {
 saved: boolean; dirty: boolean; status: GroupStatus; version: number; memberCount: number; hasDiscarded: boolean;
 /** null while the history is not loaded or could not be read. */
 analyses: GroupAnalysis[] | null;
}
export interface GroupStepState { step: GroupStep; status: GroupStepStatus; enabled: boolean; reason: string }

const succeeded = (run: GroupAnalysis) => run.STATUS === 'SUCCESS' || run.STATUS === 'SUCCEEDED';
const timeOf = (run: GroupAnalysis) => { const value = Date.parse(run.CREATED_AT); return Number.isNaN(value) ? 0 : value; };

/** Same rule the server enforces before an analysis can run, plus the unsaved-edit guard of the page. */
export function analysisBlockReason(input: GroupStepInput): string {
 if (!input.saved) return '그룹을 저장한 후 이동하세요.';
 if (input.dirty) return '저장하지 않은 변경이 있습니다. 저장한 후 이동하세요.';
 if (input.memberCount < 1) return '분석할 Requirement를 포함하고 저장하세요.';
 if (input.hasDiscarded) return '폐기된 Requirement를 포함한 그룹입니다. 구성을 정리한 후 이동하세요.';
 return '';
}

export function analysisTypeStatus(analyses: GroupAnalysis[] | null, type: GroupStepAnalysisType, version: number): GroupStepStatus {
 if (!analyses) return 'UNKNOWN';
 const runs = analyses.filter(run => run.ANALYSIS_TYPE === type).sort((left, right) => timeOf(right) - timeOf(left));
 if (runs.some(run => run.STATUS === 'RUNNING')) return 'IN_PROGRESS';
 if (runs.some(run => succeeded(run) && run.GROUP_VERSION === version)) return 'DONE';
 if (runs[0] && runs[0].GROUP_VERSION === version) return 'FAILED';
 if (runs.some(succeeded)) return 'REVIEW_REQUIRED';
 return 'NOT_STARTED';
}

export function groupStepStates(input: GroupStepInput): Record<GroupStep, GroupStepState> {
 const blocked = analysisBlockReason(input);
 // STEP 02 only shows stored results, so it needs a saved, unchanged group but no analysis precondition.
 const viewBlocked = input.saved && !input.dirty ? '' : analysisBlockReason(input);
 const step1: GroupStepStatus = !input.saved ? 'NOT_STARTED'
  : input.dirty ? 'IN_PROGRESS'
  : input.status === 'CONFIRMED' ? 'DONE'
  : input.status === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'IN_PROGRESS';
 const confirmedReason = input.status === 'REVIEW_REQUIRED' ? '요구사항 변경을 검토하고 그룹을 재확정하세요.' : '그룹을 확정하세요.';
 const step3Reason = blocked || (input.status === 'CONFIRMED' ? '' : confirmedReason);
 return {
  1: { step: 1, status: step1, enabled: true, reason: '' },
  2: { step: 2, status: viewBlocked ? 'DISABLED' : 'UNKNOWN', enabled: !viewBlocked, reason: viewBlocked },
  3: { step: 3, status: step3Reason ? 'DISABLED' : analysisTypeStatus(input.analyses, 'GROUP_PROGRAMS', input.version), enabled: !step3Reason, reason: step3Reason },
 };
}

const stepTitles: Record<GroupStep, string> = { 1: 'STEP 01 그룹 구성·확정', 2: 'STEP 02 그룹핑 분석 결과', 3: 'STEP 03 프로그램 목록' };
const statusTexts: Record<GroupStepStatus, string> = {
 UNKNOWN: '', DISABLED: '', NOT_STARTED: '미진행', IN_PROGRESS: '진행중', DONE: '완료', REVIEW_REQUIRED: '재검토 필요', FAILED: '실패',
};
export const stepLabel = (step: GroupStep, status: GroupStepStatus) => statusTexts[status] ? `${stepTitles[step]} · ${statusTexts[status]}` : stepTitles[step];

/** Step requested by a URL: the new step parameter wins, the legacy tab=analysis opens STEP 02. */
export function stepFromQuery(params: URLSearchParams): GroupStep {
 const step = params.get('step');
 if (step === '2' || step === '3') return Number(step) as GroupStep;
 return step === '1' ? 1 : params.get('tab') === 'analysis' ? 2 : 1;
}

/** Explanations for steps that cannot be opened; steps blocked for the same reason share one line. */
export function disabledStepNotes(states: Record<GroupStep, GroupStepState>): string[] {
 const byReason = new Map<string, string[]>();
 for (const step of [2, 3] as const) {
  if (states[step].enabled) continue;
  byReason.set(states[step].reason, [...(byReason.get(states[step].reason) ?? []), String(step).padStart(2, '0')]);
 }
 return [...byReason].map(([reason, steps]) => `STEP ${steps.join('·')} 이동 불가: ${reason}`);
}
