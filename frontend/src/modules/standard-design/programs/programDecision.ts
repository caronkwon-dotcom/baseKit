/** How a program candidate relates to the project's program register; derived from server fields only. */
export type CandidateState = 'NEW' | 'REUSE' | 'CHANGE' | 'REVIEW_REQUIRED' | 'NOT_COMPARED';
export type CandidateFilter = 'ALL' | CandidateState;

export interface CandidateJudgment {
 LEDGER_COMPARE?: string | null; DECISION?: string | null; REVIEW_STATUS?: string | null;
}

const labels: Record<CandidateState, string> = { NEW: '신규', REUSE: '재사용', CHANGE: '변경', REVIEW_REQUIRED: '검토 필요', NOT_COMPARED: '대장 비교 미수행' };

export const candidateStateLabel = (state: CandidateState) => labels[state];

/** Results of analyses that never compared the register (older prompts) have no judgment at all. */
export function candidateState(candidate: CandidateJudgment): CandidateState {
 if (candidate.LEDGER_COMPARE !== 'DONE' && candidate.LEDGER_COMPARE !== 'PARTIAL') return 'NOT_COMPARED';
 if (candidate.REVIEW_STATUS !== 'OK') return 'REVIEW_REQUIRED';
 return candidate.DECISION === 'NEW' || candidate.DECISION === 'REUSE' || candidate.DECISION === 'CHANGE' ? candidate.DECISION : 'REVIEW_REQUIRED';
}

/** Size and omission of the register that was sent to the model, read from the stored request; null when it was not compared. */
export function ledgerInfoOf(requestJson: string | undefined | null): { total: number; included: number; omitted: number; detail: string } | null {
 try {
  const info = (JSON.parse(requestJson ?? '') as { existingProgramsInfo?: { total?: number; included?: number; omitted?: number; detail?: string } }).existingProgramsInfo;
  return info && typeof info.total === 'number' ? { total: info.total, included: info.included ?? 0, omitted: info.omitted ?? 0, detail: info.detail ?? '' } : null;
 } catch { return null; }
}

export function stateCounts(candidates: CandidateJudgment[]): Record<CandidateState, number> {
 const counts: Record<CandidateState, number> = { NEW: 0, REUSE: 0, CHANGE: 0, REVIEW_REQUIRED: 0, NOT_COMPARED: 0 };
 for (const candidate of candidates) counts[candidateState(candidate)]++;
 return counts;
}

export function filterCandidates<T extends CandidateJudgment>(candidates: T[], filter: CandidateFilter): T[] {
 return filter === 'ALL' ? candidates : candidates.filter(candidate => candidateState(candidate) === filter);
}
