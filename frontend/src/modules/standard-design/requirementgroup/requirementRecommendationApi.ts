export interface RequirementRecommendationItem {
  REQUIREMENT_ID: string;
  ORIGINAL_REASON: string;
  REQUIREMENT_MOD_DT: string;
}
export interface RequirementRecommendation {
  ANALYSIS_ID: string;
  PROJECT_ID: string;
  REQUEST_ID: string;
  ANALYSIS_BASIS: string;
  EXECUTED_AT: string;
  ITEMS: RequirementRecommendationItem[];
}
export type RequirementRecommendationInput = Omit<RequirementRecommendation, 'ANALYSIS_ID'>;
const base = '/api/standard-design/requirement-recommendations';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { MESSAGE?: string };
    throw new Error(error.MESSAGE || '추천 결과를 조회하거나 저장하지 못했습니다.');
  }
  return (await response.json() as { DATA: T }).DATA;
}
/** Completed recommendation runs only. Does not execute Analysis or edit group membership. */
export const requirementRecommendationApi = {
  list: (projectId: string) => request<RequirementRecommendation[]>(`?PROJECT_ID=${encodeURIComponent(projectId)}`),
  get: (id: string) => request<RequirementRecommendation>(`/${encodeURIComponent(id)}`),
  save: (input: RequirementRecommendationInput) => request<RequirementRecommendation>('', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }),
};
