import { requirementGroupApi } from '../requirementgroup/requirementGroupApi.ts';
import type { GroupAnalysis } from '../requirementgroup/groupAnalysis.types';
import { requirementApi } from '../requirement/requirementApi.ts';
import { projectMenuApi } from '../projectmenu/projectMenuApi.ts';
import { analysisDraft } from './analysisDraft.ts';
export async function loadAnalysisDraft(project: string) {
 const [groups, requirements, menus] = await Promise.all([requirementGroupApi.list(project),requirementApi.list(project),projectMenuApi.list(project)]);
 const sources = [];
 // Sequential reads avoid flooding the backend for projects with many groups.
 for (const item of groups) {
  const group = await requirementGroupApi.get(item.REQUIREMENT_GROUP_ID);
  const response = await fetch(`/api/standard-design/requirement-groups/${encodeURIComponent(group.REQUIREMENT_GROUP_ID)}/analyses/menu-draft`);
  if (!response.ok) throw new Error('초안용 읽기 전용 분석 조회 실패. 최신 SD 백엔드 실행을 확인하세요.');
  const list = (await response.json() as {DATA:GroupAnalysis[]}).DATA;
  const latest = list.filter(a => a.ANALYSIS_TYPE === 'GROUP_DESIGN').sort((a,b) => b.CREATED_AT.localeCompare(a.CREATED_AT) || b.ANALYSIS_ID.localeCompare(a.ANALYSIS_ID))[0];
  sources.push({group,analysis:latest ? await requirementGroupApi.analysis(group.REQUIREMENT_GROUP_ID,latest.ANALYSIS_ID) : undefined});
 }
 const result = analysisDraft(sources,requirements,menus.ITEMS);
 if (result.nodes.length > 2000) throw new Error('브라우저 초안은 최대 2000개 메뉴를 지원합니다. 그룹 분석 범위를 검토하세요.');
 if (!groups.length) result.warnings.push('프로젝트에 그룹이 없습니다. 요구사항 관리 → AI 전체 그룹핑 → 그룹 분석 순서로 진행하세요.');
 return result;
}
