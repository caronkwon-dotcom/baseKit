import type { GroupAnalysis } from './groupAnalysis.types';
import type { Requirement } from '../requirement/requirementApi';
export type GroupStatus = 'DRAFT' | 'CONFIRMED' | 'REVIEW_REQUIRED';
export interface GroupMember {
 REQUIREMENT_ID: string; HUMAN_YN: 'Y' | 'N'; INCLUSION_REASON: string; REVIEWED_REVISION: number; SOURCE_ANALYSIS_IDS: string[];
 REQUIREMENT?: Requirement; REVIEWED_SNAPSHOT?: string;
}
export interface RequirementGroup {
 REQUIREMENT_GROUP_ID: string; PROJECT_ID: string; REQUIREMENT_GROUP_NAME: string; DESCRIPTION: string;
 GROUP_STATUS: GroupStatus; VERSION: number; REQUEST_ID: string; MEMBERS: GroupMember[]; MEMBER_COUNT?: number; HAS_ANALYSIS_SNAPSHOT?: boolean;
}
export interface GroupInput { PROJECT_ID: string; REQUIREMENT_GROUP_NAME: string; DESCRIPTION: string; VERSION: number; REQUEST_ID: string; MEMBERS: Omit<GroupMember,'REQUIREMENT' | 'REVIEWED_SNAPSHOT'>[] }
const base='/api/standard-design/requirement-groups';
export class GroupApiError extends Error { status:number; constructor(status: number, message: string) { super(message); this.status=status; } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const response=await fetch(`${base}${path}`,init);
 if(!response.ok) { const error=await response.json().catch(()=>({})) as {MESSAGE?: string}; throw new GroupApiError(response.status,error.MESSAGE || '그룹 요청을 처리하지 못했습니다.'); }
 if(response.status===204) return undefined as T;
 return (await response.json() as {DATA:T}).DATA;
}
const body=(method:string,input:unknown):RequestInit=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export const requirementGroupApi={
 list:(project:string,req?:string)=>request<RequirementGroup[]>(`?PROJECT_ID=${encodeURIComponent(project)}${req ? `&REQUIREMENT_ID=${encodeURIComponent(req)}` : ''}`),
 get:(id:string)=>request<RequirementGroup>(`/${encodeURIComponent(id)}`),
 save:(id:string,input:GroupInput)=>request<RequirementGroup>(id ? `/${encodeURIComponent(id)}` : '',body(id ? 'PUT':'POST',input)),
 confirm:(id:string,version:number,projectName?:string)=>request<RequirementGroup>(`/${encodeURIComponent(id)}/confirm`,body('POST',{VERSION:version,PROJECT_NAME:projectName})),
 edit:(id:string,version:number)=>request<RequirementGroup>(`/${encodeURIComponent(id)}/edit`,body('POST',{VERSION:version})),
 analyses:(id:string)=>request<GroupAnalysis[]>(`/${encodeURIComponent(id)}/analyses`),
 analysis:(id:string,analysisId:string)=>request<GroupAnalysis>(`/${encodeURIComponent(id)}/analyses/${encodeURIComponent(analysisId)}`),
 analyze:(id:string,version:number,requestId:string)=>request<GroupAnalysis>(`/${encodeURIComponent(id)}/analyses`,body('POST',{VERSION:version,REQUEST_ID:requestId})),
 delete:(id:string,version:number)=>request<void>(`/${encodeURIComponent(id)}?VERSION=${version}`,{method:'DELETE'}),
};
export const groupStatusLabels:Record<GroupStatus,string>={DRAFT:'작성중',CONFIRMED:'확정',REVIEW_REQUIRED:'재검토 필요'};
export const groupInput=(group:RequirementGroup):GroupInput=>({PROJECT_ID:group.PROJECT_ID,REQUIREMENT_GROUP_NAME:group.REQUIREMENT_GROUP_NAME,DESCRIPTION:group.DESCRIPTION,VERSION:group.VERSION,REQUEST_ID:group.REQUEST_ID,MEMBERS:group.MEMBERS.map(m=>({REQUIREMENT_ID:m.REQUIREMENT_ID,HUMAN_YN:m.HUMAN_YN,INCLUSION_REASON:m.INCLUSION_REASON,REVIEWED_REVISION:m.REVIEWED_REVISION,SOURCE_ANALYSIS_IDS:m.SOURCE_ANALYSIS_IDS}))});
export function mergeGroupMembers(existing:GroupMember[],added:GroupMember[]):GroupMember[] {
 const result=new Map(existing.map(m=>[m.REQUIREMENT_ID,{...m,SOURCE_ANALYSIS_IDS:[...m.SOURCE_ANALYSIS_IDS]}]));
 for(const member of added) { const previous=result.get(member.REQUIREMENT_ID); result.set(member.REQUIREMENT_ID,previous ? {...previous,HUMAN_YN:previous.HUMAN_YN==='Y' || member.HUMAN_YN==='Y' ? 'Y':'N',SOURCE_ANALYSIS_IDS:[...new Set([...previous.SOURCE_ANALYSIS_IDS,...member.SOURCE_ANALYSIS_IDS])]} : {...member,SOURCE_ANALYSIS_IDS:[...new Set(member.SOURCE_ANALYSIS_IDS)]}); }
 return [...result.values()];
}
export function openRequirementGroup(projectId:string,id:string) {
 sessionStorage.setItem('basekit:requirement-group-jump',JSON.stringify({PROJECT_ID:projectId,REQUIREMENT_GROUP_ID:id}));
 sessionStorage.setItem('basekit:requirement-group-target',JSON.stringify({PROJECT_ID:projectId,REQUIREMENT_GROUP_ID:id}));
 window.dispatchEvent(new CustomEvent('basekit:open-program',{detail:{PROGRAM_KEY:'SD_REQUIREMENT_GROUP'}}));
 window.dispatchEvent(new Event('basekit:requirement-group-selected'));
}
