export interface ProgramEvidence { REQUIREMENT_ID:string; REQUIREMENT_REVISION:number|null; SNAPSHOT_JSON:string|null }
export interface DesignProgram { PROGRAM_ID:string; PROJECT_ID:string; PROGRAM_NAME:string; DESCRIPTION:string; VERSION:number; SOURCE_GROUP_ID:string|null; SOURCE_ANALYSIS_ID:string|null; SOURCE_RESULT_VERSION:number|null; EVIDENCE:ProgramEvidence[] }
export interface CandidateEvidence { requirementId:string; revision?:number; name?:string; description?:string; processDescription?:string }
export interface ProgramCandidate { CANDIDATE_INDEX:number; PROGRAM_NAME:string; DESCRIPTION:string; GROUP_VERSION:number; PROGRAM_ID:string|null; ERROR:string|null; EVIDENCE:CandidateEvidence[] }
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
 adopt:(project:string,group:string,analysis:string,indexes:number[])=>request<DesignProgram[]>(project,'/adoptions',body('POST',{GROUP_ID:group,ANALYSIS_ID:analysis,CANDIDATE_INDEXES:indexes})),
};
