import type { Program } from '../types/program';
export type ButtonGroup = { GROUP_CODE: string; GROUP_TYPE: 'COMMON' | 'CUSTOM'; GROUP_NAME: string; DESCRIPTION: string; USE_YN: 'Y' | 'N' };
export type Endpoint = { ENDPOINT_ID: string; HTTP_METHOD: string; PATH: string; CONTROLLER_CLASS: string; HANDLER_METHOD: string; COLLECTION_STATUS: 'ACTIVE' | 'STALE'; MAPPING_STATUS: 'MAPPED' | 'UNMAPPED' | 'OTHER_PROGRAM'; GROUP_CODE: string | null };
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
  groups:(id:string)=>request<ButtonGroup[]>(`/${encodeURIComponent(id)}/button-groups`),
  saveGroups:(id:string,groups:ButtonGroup[])=>request<ButtonGroup[]>(`/${encodeURIComponent(id)}/button-groups`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({GROUPS:groups})}),
  endpoints:(id:string)=>request<Endpoint[]>(`/${encodeURIComponent(id)}/endpoints`),
  mapEndpoint:(id:string,endpointId:string,groupCode:string|null)=>request<void>(`/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(endpointId)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({GROUP_CODE:groupCode})}),
  unmapEndpoint:(id:string,endpointId:string)=>request<void>(`/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(endpointId)}`,{method:'DELETE'}),
  find:(values:Record<string,string>)=>request<Program[]>(query(values)),
  create:(value:ProgramSave)=>request<Program>('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}),
  update:(value:ProgramSave)=>request<Program>(`/${encodeURIComponent(value.PROGRAM_ID)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}),
  delete:(id:string)=>request<void>(`/${encodeURIComponent(id)}`,{method:'DELETE'}),
};
