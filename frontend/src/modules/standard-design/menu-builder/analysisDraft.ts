import type { MenuNode } from './menuBuilder';
import type { RequirementGroup } from '../requirementgroup/requirementGroupApi';
import type { GroupAnalysis } from '../requirementgroup/groupAnalysis.types';
import type { Requirement } from '../requirement/requirementApi';
import type { ProjectMenu } from '../projectmenu/projectMenuApi';
import { adaptGroupAnalysis } from '../requirementgroup/groupAnalysisAdapter.ts';
export interface DraftSource { group: RequirementGroup; analysis?: GroupAnalysis }
export function analysisDraft(sources: DraftSource[], requirements: Requirement[], menus: ProjectMenu[]) {
 const nodes: MenuNode[] = []; const warnings: string[] = [];
 for (const { group, analysis } of sources) {
  const label = `${group.REQUIREMENT_GROUP_NAME} (${group.REQUIREMENT_GROUP_ID})`;
  if (!analysis || analysis.ANALYSIS_TYPE !== 'GROUP_DESIGN' || !['SUCCESS','SUCCEEDED'].includes(analysis.STATUS)) { warnings.push(`${label}: 성공한 그룹 설계 분석이 없습니다. 그룹 분석을 먼저 실행하세요.`); continue; }
  if (analysis.GROUP_VERSION !== group.VERSION || group.GROUP_STATUS === 'REVIEW_REQUIRED') { warnings.push(`${label}: 분석 버전 또는 그룹 재검토가 필요합니다. 이전 분석 후보를 참고용으로 표시합니다. 재분석을 권장합니다.`); }
  const display = adaptGroupAnalysis(analysis);
  warnings.push(...display.WARNINGS.map(w => `${label}: ${w}`));
  const root = `group:${group.REQUIREMENT_GROUP_ID}`;
  const candidates = display.SECTIONS.filter(s => ['programCandidates','screenCandidates'].includes(s.KEY)).flatMap(s => s.ITEMS.map((item,index) => ({...item, key:s.KEY, index})));
  const children: MenuNode[] = [];
  for (const candidate of candidates) {
   if (display.WARNINGS.some(w => w.startsWith(`${candidate.key}[${candidate.index}]:`))) { warnings.push(`${label} / ${candidate.TITLE}: 후보 형식 또는 근거를 확인하세요. 제외했습니다.`); continue; }
   const valid = [...new Set(candidate.EVIDENCE_REQUIREMENT_IDS)].map(id => requirements.find(r => r.REQUIREMENT_ID === id && r.PROJECT_ID === group.PROJECT_ID && r.DISCARDED_YN !== 'Y' && group.MEMBERS.some(m => m.REQUIREMENT_ID === id)));
   if (!valid.length || valid.some(r => !r) || /^후보 \d+$/.test(candidate.TITLE) || !candidate.TITLE.trim()) { warnings.push(`${label} / ${candidate.TITLE}: 이름 또는 그룹 내 요구사항 근거가 유효하지 않아 제외했습니다.`); continue; }
   const evidence = valid.filter((r): r is Requirement => !!r);
   const existing = evidence.map(r => `${r.REQUIREMENT_ID}: ${r.PROJECT_MENU_IDS.map(id => menus.find(m => m.PROJECT_MENU_ID === id)?.MENU_NAME ?? id).concat(r.MENU_KEYS).join(', ') || '기존 연결 없음'}`).join('\n');
   children.push({ MENU_ID:`${root}:${analysis.ANALYSIS_ID}:${candidate.key}:${candidate.index}`, PARENT_ID:root, MENU_NAME:candidate.TITLE.trim(), DESCRIPTION:candidate.DESCRIPTION, MENU_TYPE:'SCREEN', REQUIREMENTS:evidence.map(r => ({REQUIREMENT_ID:r.REQUIREMENT_ID,REQUIREMENT_NAME:r.REQUIREMENT_NAME})), GROUP_NAME:label, AI_REASON:`분석 ${analysis.ANALYSIS_ID} / 분석 버전 ${analysis.GROUP_VERSION} / 현재 그룹 버전 ${group.VERSION} (${group.GROUP_STATUS})\n${candidate.key}[${candidate.index}]\n${candidate.DESCRIPTION}\n기존 메뉴 관계 (참고 전용)\n${existing}` });
  }
  if (children.length) nodes.push({MENU_ID:root,PARENT_ID:null,MENU_NAME:group.REQUIREMENT_GROUP_NAME,DESCRIPTION:group.DESCRIPTION,MENU_TYPE:'FOLDER',REQUIREMENTS:[],GROUP_NAME:label,AI_REASON:`분석 ${analysis.ANALYSIS_ID}. 그룹별 폴더는 화면의 고정 변환 규칙이며 AI 계층 추천이 아닙니다.`},...children);
  else warnings.push(`${label}: 유효한 프로그램/화면 후보가 없습니다.`);
 }
 return {nodes,warnings};
}
