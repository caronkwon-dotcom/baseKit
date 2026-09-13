import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProgramFieldDefinitions } from '../adapters/programFieldAdapter';
import { FormModal, PageHeader, ProgramDataGrid, SearchPanel, type DataTableColumn, type SearchFieldConfig } from '../components/common';
import { MetadataForm, type FieldDefinition } from '../components/metadata';
import { COMMON_ACTIONS } from '../constants/actionCodes';
import { programApi, type ProgramSave } from '../services/programApi';
import type { Program } from '../types/program';

type Condition={KEYWORD:string;MODULE_CODE:string;PROGRAM_TYPE_CODE:string;USE_YN:string};
const initial:Condition={KEYWORD:'',MODULE_CODE:'',PROGRAM_TYPE_CODE:'',USE_YN:''};
const empty:ProgramSave={PROGRAM_ID:'',PROGRAM_KEY:'',PROGRAM_NAME:'',MODULE_CODE:'',PROGRAM_TYPE_CODE:'',ROUTE:'',DESCRIPTION:'',USE_YN:'Y'};
const columns:DataTableColumn<Program>[]=[
  {key:'PROGRAM_ID',header:'프로그램 ID',width:145,render:r=>r.PROGRAM_ID},
  {key:'PROGRAM_NAME',header:'프로그램명',minWidth:130,flex:1,render:r=>r.PROGRAM_NAME},
  {key:'MODULE_CODE',header:'Module',width:120,render:r=>r.MODULE_CODE},
  {key:'PROGRAM_TYPE_CODE',header:'유형',width:105,render:r=>r.PROGRAM_TYPE_CODE},
  {key:'ROUTE',header:'Route',minWidth:170,flex:1,render:r=>r.ROUTE},
  {key:'USE_YN',header:'사용',width:55,align:'center',render:r=>r.USE_YN},
  {key:'MOD_BY',header:'최종수정자',width:95,render:r=>r.MOD_BY},
  {key:'MOD_DT',header:'최종수정일시',width:145,render:r=>new Date(r.MOD_DT).toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})},
];
export default function ProgramManagePage(){
  const [condition,setCondition]=useState(initial),[rows,setRows]=useState<Program[]>([]),[fields,setFields]=useState<FieldDefinition[]>([]),[selected,setSelected]=useState<Set<string>>(new Set());
  const [editor,setEditor]=useState<{mode:'create'|'update';value:Record<string,string>}|null>(null),[removeTarget,setRemoveTarget]=useState<Program|null>(null),[message,setMessage]=useState<{tone:'success'|'error';text:string}|null>(null),[submitting,setSubmitting]=useState(false);
  const searchFields=useMemo<SearchFieldConfig<Condition>[]>(()=>[
    {key:'KEYWORD',label:'프로그램',placeholder:'ID / KEY / 프로그램명'},
    {key:'MODULE_CODE',label:'Module',controlType:'select',options:[{value:'',label:'전체'},...(fields.find(f=>f.key==='MODULE_CODE')?.options??[])]},
    {key:'PROGRAM_TYPE_CODE',label:'프로그램 유형',controlType:'select',options:[{value:'',label:'전체'},...(fields.find(f=>f.key==='PROGRAM_TYPE_CODE')?.options??[])]},
    {key:'USE_YN',label:'사용 여부',controlType:'select',options:[{value:'',label:'전체'},{value:'Y',label:'사용'},{value:'N',label:'미사용'}]},
  ],[fields]);
  const load=useCallback(async(c:Condition)=>{try{setRows(await programApi.find(c));setSelected(new Set());}catch(e){setMessage({tone:'error',text:e instanceof Error?e.message:'조회하지 못했습니다.'});}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void getProgramFieldDefinitions().then(setFields).catch(e=>setMessage({tone:'error',text:e instanceof Error?e.message:'공통코드를 읽지 못했습니다.'}));void load(initial);},0);return()=>window.clearTimeout(timer);},[load]);
  const selectedRow=()=>{const r=rows.filter(x=>selected.has(x.PROGRAM_ID));if(r.length!==1){setMessage({tone:'error',text:'대상을 한 건 선택해 주세요.'});return null;}return r[0];};
  const save=async()=>{if(!editor)return;setSubmitting(true);try{const v=editor.value as unknown as ProgramSave;for(const f of fields.filter(x=>x.required)){if(!String(editor.value[f.key]??'').trim())throw new Error(`${f.label}은(는) 필수입니다.`);}await(editor.mode==='create'?programApi.create(v):programApi.update(v));setEditor(null);await load(condition);setMessage({tone:'success',text:'저장되었습니다.'});}catch(e){setMessage({tone:'error',text:e instanceof Error?e.message:'저장하지 못했습니다.'});}finally{setSubmitting(false);}};
  const remove=async()=>{if(!removeTarget)return;setSubmitting(true);try{await programApi.delete(removeTarget.PROGRAM_ID);setRemoveTarget(null);await load(condition);setMessage({tone:'success',text:'삭제되었습니다.'});}catch(e){setMessage({tone:'error',text:e instanceof Error?e.message:'삭제하지 못했습니다.'});}finally{setSubmitting(false);}};
  return <section className="page program-manage-page standard-grid-page"><PageHeader breadcrumbs={['시스템관리','프로그램관리']} description="실행·MDI·권한의 기준이 되는 프로그램 Metadata를 관리합니다."/><SearchPanel rows={1} fields={searchFields} value={condition} initialValue={initial} onValueChange={setCondition} onSearch={load} onReset={load}/><div className="standard-grid-workspace"><ProgramDataGrid programKey="PROGRAM_MGMT" roleCode="ADMIN" columns={columns} rows={rows} getRowKey={r=>r.PROGRAM_ID} selectedRowKeys={selected} onSelectedRowKeysChange={setSelected} actionHandlers={{[COMMON_ACTIONS.CREATE]:()=>setEditor({mode:'create',value:Object.fromEntries(Object.entries(empty).map(([k,v])=>[k,v??'']))}),[COMMON_ACTIONS.UPDATE]:()=>{const r=selectedRow();if(r)setEditor({mode:'update',value:Object.fromEntries(Object.entries(r).map(([k,v])=>[k,String(v??'')]))});},[COMMON_ACTIONS.DELETE]:()=>{const r=selectedRow();if(r)setRemoveTarget(r);}}}/><div className="grid-message-area">{message?<div className={`page-message ${message.tone}`}>{message.text}</div>:null}</div></div><FormModal open={!!editor} title={`프로그램 ${editor?.mode==='create'?'등록':'수정'}`} submitting={submitting} onClose={()=>setEditor(null)} onSubmit={()=>void save()}>{editor?<MetadataForm legend="프로그램 정보" fields={fields} values={editor.value} onChange={value=>setEditor({...editor,value:editor.mode==='update'?{...value,PROGRAM_ID:editor.value.PROGRAM_ID}:value})}/>:null}</FormModal><FormModal open={!!removeTarget} title="삭제 확인" submitLabel="삭제" submitTone="danger" submitting={submitting} onClose={()=>setRemoveTarget(null)} onSubmit={()=>void remove()}><p><strong>{removeTarget?.PROGRAM_NAME}</strong> 프로그램을 삭제하시겠습니까?</p></FormModal></section>;
}
