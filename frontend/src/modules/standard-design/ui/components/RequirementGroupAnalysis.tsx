import { useEffect, useRef, useState } from 'react';
import { ActionButton, BaseKitMessage, FormModal } from '../../../../components/common';
import { requirementGroupApi as api, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import type { GroupAnalysis } from '../../requirementgroup/groupAnalysis.types';

const labels={RUNNING:'분석 중',SUCCEEDED:'파싱 성공 · 검토 필요',CALL_FAILED:'호출 실패',PARSE_FAILED:'파싱 실패'};
export default function RequirementGroupAnalysis({group,onClose}:{group:RequirementGroup;onClose:()=>void}) {
 const [runs,setRuns]=useState<GroupAnalysis[]>([]), [selected,setSelected]=useState<GroupAnalysis|null>(null);
 const [busy,setBusy]=useState(false), [error,setError]=useState('');
 const request=useRef<string|null>(null), running=useRef(false), alive=useRef(true);
 useEffect(()=>{
  let current=true; alive.current=true;
  api.analyses(group.REQUIREMENT_GROUP_ID).then(async list=>{
   if(!current)return; setRuns(list);
   if(list[0]) {const result=await api.analysis(group.REQUIREMENT_GROUP_ID,list[0].ANALYSIS_ID);if(current)setSelected(result);}
  }).catch(()=>{if(current)setError('실행 이력을 조회하지 못했습니다. 다시 조회하세요.');});
  return()=>{current=false;alive.current=false;};
 },[group.REQUIREMENT_GROUP_ID]);
 const operate=async(work:()=>Promise<void>)=>{
  if(running.current)return; running.current=true;setBusy(true);setError('');
  try {await work();} catch(e) {if(alive.current)setError(e instanceof Error ? e.message:'분석 요청 실패. 실행 이력을 확인하세요.');}
  finally {running.current=false;if(alive.current)setBusy(false);}
 };
 const refresh=()=>void operate(async()=>{
  const list=await api.analyses(group.REQUIREMENT_GROUP_ID); if(!alive.current)return;setRuns(list);
  // Recover a lost POST response by its request ID before permitting another paid call.
  const found=request.current ? list.find(run=>run.REQUEST_ID===request.current):undefined;
  const target=found ?? list.find(run=>run.ANALYSIS_ID===selected?.ANALYSIS_ID) ?? list[0];
  if(target) {const result=await api.analysis(group.REQUIREMENT_GROUP_ID,target.ANALYSIS_ID);if(alive.current)setSelected(result);}
  if(found)request.current=null;
 });
 const execute=()=>void operate(async()=>{
  request.current ??=crypto.randomUUID();
  const result=await api.analyze(group.REQUIREMENT_GROUP_ID,group.VERSION,request.current);
  request.current=null;if(!alive.current)return;setSelected(result);
  setRuns(await api.analyses(group.REQUIREMENT_GROUP_ID));
 });
 const response=selected?.RESPONSE;
 const sections=[['businessStructure','업무 구조'],['processes','프로세스'],['screenCandidates','화면 후보'],['programCandidates','Program · 시스템 후보'],['observations','확인 필요 사항']] as const;
 return <FormModal open title="그룹 설계 분석 V0" submitting={busy} onClose={onClose} footerActions={<div className="grid-toolbar"><ActionButton actionCode="EXECUTE" label="분석 실행·요청 재확인" disabled={busy || group.GROUP_STATUS!=='CONFIRMED' || !group.HAS_ANALYSIS_SNAPSHOT || runs.some(run=>run.STATUS==='RUNNING')} onClick={execute} /><ActionButton actionCode="SEARCH" label="실행 이력 조회" disabled={busy} onClick={refresh} /></div>}>
  <p>확정된 Snapshot을 분석합니다. 모든 결과는 검토용 제안입니다.</p>
  {!group.HAS_ANALYSIS_SNAPSHOT ? <BaseKitMessage type="warn" message="확정 시점 Snapshot이 없습니다. 현재 내용을 검토하고 재확정하세요." />:null}
  {error ? <BaseKitMessage type="error" message={error} />:null}
  <label>실행 이력<select aria-label="그룹 분석 실행 이력" disabled={busy} value={selected?.ANALYSIS_ID ?? ''} onChange={e=>{const id=e.target.value;if(id)void operate(async()=>{const result=await api.analysis(group.REQUIREMENT_GROUP_ID,id);if(alive.current)setSelected(result);});}}><option value="">실행 선택</option>{runs.map(run=><option key={run.ANALYSIS_ID} value={run.ANALYSIS_ID}>{run.CREATED_AT} · {labels[run.STATUS]} · {run.ANALYSIS_ID}</option>)}</select></label>
  {selected ? <><p>{labels[selected.STATUS]} · v{selected.GROUP_VERSION} · {selected.MODEL_NAME} · {selected.PROMPT_VERSION}</p>{selected.ERROR_MESSAGE ? <BaseKitMessage type="error" message={selected.ERROR_MESSAGE} />:null}
  {selected.STATUS==='RUNNING' ? <BaseKitMessage type="info" message="진행 중인 실행입니다. 잠시 후 실행 이력을 조회하세요. 서버 중단으로 남은 실행은 관리자 확인이 필요합니다." />:null}
  {selected.WARNINGS?.length ? <section><h3>근거 검토</h3><ul>{selected.WARNINGS.map((warning,index)=><li key={index}>{warning}</li>)}</ul></section>:null}
  {response ? <><section><h3>요약</h3><p>{response.summary.text}</p></section>{sections.map(([key,title])=><section key={key}><h3>{title} ({response[key].length})</h3>{response[key].map((item,index)=><pre key={index} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(item,null,2)}</pre>)}</section>)}</>:null}
  <details><summary>입력 Snapshot JSON</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.REQUEST_JSON}</pre></details>
  <details><summary>수신 원문 (HTTP 응답 / 기존 분석 원문)</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.RESPONSE_RAW_JSON ?? '응답이 없습니다.'}</pre></details></>:<p>저장된 분석 실행이 없습니다.</p>}
 </FormModal>;
}

