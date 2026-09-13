import type { Program } from '../types/program';
interface ApiResponse<T> { SUCCESS: boolean; DATA: T }
interface ErrorResponse { MESSAGE?: string; FIELD_ERRORS?: Array<{FIELD_NAME:string; MESSAGE:string}> }
export type ProgramSave = Pick<Program,'PROGRAM_ID'|'PROGRAM_KEY'|'PROGRAM_NAME'|'MODULE_CODE'|'PROGRAM_TYPE_CODE'|'ROUTE'|'DESCRIPTION'|'USE_YN'>;
async function request<T>(path='', init?:RequestInit):Promise<T>{
  const response=await fetch(`/api/core/programs${path}`,init);
  if(!response.ok){const e=await response.json().catch(()=>({})) as ErrorResponse; throw new Error(e.FIELD_ERRORS?.map(x=>`${x.FIELD_NAME}: ${x.MESSAGE}`).join(', ')||e.MESSAGE||'프로그램 요청을 처리하지 못했습니다.');}
  if(response.status===204)return undefined as T;
  return ((await response.json()) as ApiResponse<T>).DATA;
}
function query(values:Record<string,string>){const p=new URLSearchParams(); Object.entries(values).forEach(([k,v])=>v&&p.set(k,v)); return p.size?`?${p}`:'';}
export const programApi={
  find:(values:Record<string,string>)=>request<Program[]>(query(values)),
  create:(value:ProgramSave)=>request<Program>('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}),
  update:(value:ProgramSave)=>request<Program>(`/${encodeURIComponent(value.PROGRAM_ID)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}),
  delete:(id:string)=>request<void>(`/${encodeURIComponent(id)}`,{method:'DELETE'}),
};
