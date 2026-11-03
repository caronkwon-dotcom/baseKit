export interface ProgramEvidence { REQUIREMENT_ID:string; REQUIREMENT_REVISION:number|null; SNAPSHOT_JSON:string|null }
export interface DesignProgram { PROGRAM_KIND?:string|null; PROGRAM_ID:string; PROJECT_ID:string; PROGRAM_NAME:string; DESCRIPTION:string; VERSION:number; SOURCE_GROUP_ID:string|null; SOURCE_ANALYSIS_ID:string|null; SOURCE_RESULT_VERSION:number|null; EVIDENCE:ProgramEvidence[] }
export interface CandidateEvidence { requirementId:string; revision?:number; name?:string; description?:string; processDescription?:string }
export interface CandidateNote { CODE:string; MESSAGE:string }
export interface ExistingProgram { PROGRAM_ID:string; PROGRAM_NAME:string; PROGRAM_KIND:string|null; VERSION:number|null; SHARED_REQUIREMENT_IDS:string[] }
export interface AdoptionCheck { NAME_CONFLICTS:{CANDIDATE_INDEX:number;CANDIDATE_NAME:string;PROGRAM_ID:string;PROGRAM_NAME:string}[]; SIMILAR_NAMES:{CANDIDATE_INDEX:number;CANDIDATE_NAME:string;PROGRAM_ID:string;PROGRAM_NAME:string}[]; ADDED_AFTER_ANALYSIS:{PROGRAM_ID:string;PROGRAM_NAME:string}[] }
export interface ProgramCandidate { LEDGER_COMPARE?:'DONE'|'PARTIAL'|'NOT_PERFORMED'; DECISION?:string|null; EXISTING_PROGRAM_ID?:string|null; DECISION_REASON?:string|null; CHANGE_SUMMARY?:string|null; REVIEW_STATUS?:string|null; ISSUES?:CandidateNote[]; WARNINGS?:CandidateNote[]; EXISTING?:ExistingProgram|null; BLOCK_REASONS?:string[]; REGISTRABLE?:boolean; PROGRAM_KIND?:string|null; CANDIDATE_INDEX:number; PROGRAM_NAME:string; DESCRIPTION:string; GROUP_VERSION:number; PROGRAM_ID:string|null; ERROR:string|null; EVIDENCE:CandidateEvidence[] }
async function request<T>(project:string,path='',init?:RequestInit):Promise<T> {
 const response=await fetch('/api/standard-design/projects/'+encodeURIComponent(project)+'/programs'+path,init);
 if(!response.ok){const error=await response.json().catch(()=>({})) as {MESSAGE?:string};throw new Error(error.MESSAGE||'프로그램 요청에 실패했습니다.');}
 return (await response.json() as {DATA:T}).DATA;
}
const body=(method:string,input:unknown)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
export const designProgramApi={
 list:(project:string)=>request<DesignProgram[]>(project),
 save:(project:string,id:string,input:{PROGRAM_NAME:string;DESCRIPTION:string;VERSION?:number})=>request<DesignProgram>(project,id?'/'+encodeURIComponent(id):'',body(id?'PUT':'POST',input)),
 candidates:(project:string,group:string,analysis:string)=>request<ProgramCandidate[]>(project,'/candidates?'+new URLSearchParams({GROUP_ID:group,ANALYSIS_ID:analysis})),
 adopt:(project:string,group:string,analysis:string,indexes:number[],acknowledgeLedgerChanges=false)=>request<DesignProgram[]>(project,'/adoptions',body('POST',{GROUP_ID:group,ANALYSIS_ID:analysis,CANDIDATE_INDEXES:indexes,...(acknowledgeLedgerChanges ? {ACKNOWLEDGE_LEDGER_CHANGES:true}:{})})),
 adoptionCheck:(project:string,group:string,analysis:string,indexes:number[])=>request<AdoptionCheck>(project,'/adoption-check?'+new URLSearchParams({GROUP_ID:group,ANALYSIS_ID:analysis,CANDIDATE_INDEXES:indexes.join(',')})),
};
