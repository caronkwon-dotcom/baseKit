import { requirementGroupApi as api } from './requirementGroupApi.ts';
import { requirementApi } from '../requirement/requirementApi.ts';
import type { Requirement } from '../requirement/requirementApi.ts';
import type { GroupAnalysis } from './groupAnalysis.types.ts';

export const DESIGN_REVIEW_PATH = '/standard-design/design-review';
export function designReviewUrl(project: string, group: string, analysis: string, sourcePath: string) {
 const windowPath = sourcePath.startsWith('/window/') ? sourcePath : '';
 const params = new URLSearchParams({project, group, analysis});
 if (windowPath) params.set('workspace','design-review');
 return '#' + (windowPath || DESIGN_REVIEW_PATH) + '?' + params;
}
export function groupAnalysisUrl(project: string, group: string, analysis: string, sourcePath: string) {
 return '#' + (sourcePath.startsWith('/window/') ? sourcePath : '/standard-design/requirement-groups') + '?' + new URLSearchParams({project,group,analysis,tab:'analysis'});
}
/** Only audited GET methods. The ordinary analyses list expires RUNNING records. */
export async function loadDesignReview(project: string, groupId: string, analysisId: string) {
 if (!project || !groupId || !analysisId) throw new Error('프로젝트·그룹·분석 ID가 필요합니다. 분석 실행을 지정하세요.');
 const group = await api.get(groupId);
 if (group.REQUIREMENT_GROUP_ID !== groupId || group.PROJECT_ID !== project) throw new Error('그룹/프로젝트 불일치: 지정한 프로젝트의 그룹이 아닙니다.');
 const [analysis, runs, requirements] = await Promise.all([api.analysis(groupId,analysisId), api.readOnlyAnalyses(groupId), requirementApi.list(project)]);
 if (analysis.REQUIREMENT_GROUP_ID !== groupId || analysis.ANALYSIS_ID !== analysisId || analysis.ANALYSIS_TYPE !== 'GROUP_DESIGN') throw new Error('지정한 그룹의 GROUP_DESIGN 분석 기록이 아닙니다.');
 return {group, analysis, runs:runs.filter(run=>run.ANALYSIS_TYPE==='GROUP_DESIGN'), requirements};
}
const record = (value: unknown): Record<string,unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
const text = (value: unknown) => typeof value === 'string' ? value : '';
export function analysisEvidence(run: GroupAnalysis, requirements: Requirement[], project: string, group: string) {
 const warnings: string[] = [];
 let input: Record<string,unknown> | null = null;
 try { input=record(JSON.parse(run.REQUEST_JSON || 'null')); } catch { warnings.push('분석 입력 스냅샷 형식을 읽지 못했습니다. 원문을 확인하세요.'); }
 if (!input || !Array.isArray(input.requirements)) warnings.push('분석 입력 요구사항 스냅샷 미제공: 현재 내용으로 대체하지 않습니다.');
 const savedProject = text(record(input?.project)?.projectId);
 const savedGroup = text(record(input?.group)?.groupId);
 if ((savedProject && savedProject !== project) || (savedGroup && savedGroup !== group)) throw new Error('분석 입력 스냅샷의 그룹/프로젝트가 일치하지 않습니다.');
 const rows = (Array.isArray(input?.requirements) ? input.requirements : []).flatMap(value=> {
  const item=record(value); const id=text(item?.requirementId); if(!item || !id) {warnings.push('스냅샷 요구사항 ID 미제공');return [];}
  const revision=typeof item.revision==='number' ? item.revision : null;
  const current=requirements.find(req=>req.REQUIREMENT_ID===id && req.PROJECT_ID===project);
  const stale=!current || current.DISCARDED_YN==='Y' || (revision!==null && current.REQUIREMENT_REVISION!==revision);
  if(stale) warnings.push(id + ': 낡은 분석 — 현재 Rev 변경·폐기 또는 현재 요구사항 없음. 분석 당시 내용을 표시합니다.');
  if(revision===null) warnings.push(id + ': 분석 근거 Rev 미제공 — 최신 여부를 확인할 수 없습니다.');
  return [{REQUIREMENT_ID:id, NAME:text(item.name), REVISION:revision, DESCRIPTION:text(item.description), PROCESS_DESCRIPTION:text(item.processDescription), CURRENT_REVISION:current?.REQUIREMENT_REVISION ?? null, STALE:stale}];
 });
 return {ROWS:rows,WARNINGS:warnings};
}
