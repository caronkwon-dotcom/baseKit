import { useEffect, useRef, useState } from 'react';
import { ActionButton, BaseKitMessage, FormModal } from '../../../../components/common';
import FormField from '../../../../components/common/FormField';
import { requirementGroupApi as api, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import { testCompanyLlm } from '../../llm/companyLlm.repository';
import type { GroupAnalysis, GroupAnalysisStatus } from '../../requirementgroup/groupAnalysis.types';

const labels: Record<GroupAnalysisStatus,string> = {
 RUNNING:'분석 중',SUCCESS:'성공 · 검토 필요',FAILED_TIMEOUT:'실패 · 시간 초과',FAILED_LLM:'실패 · LLM 호출',
 FAILED_INVALID_JSON:'실패 · JSON 형식',FAILED_TRUNCATED:'실패 · 출력 잘림',
 SUCCEEDED:'기존 분석 성공 · 검토 필요',CALL_FAILED:'기존 호출 실패',PARSE_FAILED:'기존 파싱 실패',
};
const succeeded=(run:GroupAnalysis)=>run.STATUS==='SUCCESS' || run.STATUS==='SUCCEEDED';
export default function RequirementGroupAnalysis({group,onClose}:{group:RequirementGroup;onClose:()=>void}) {
 const [runs,setRuns]=useState<GroupAnalysis[]>([]), [selected,setSelected]=useState<GroupAnalysis|null>(null);
 const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
 const [connection,setConnection]=useState<{content:string;elapsedMs:number;model:string}|null>(null);
 const storageKey=`basekit:group-analysis-request:${group.REQUIREMENT_GROUP_ID}`;
 const [pendingRequest,setPendingRequest]=useState(()=>!!sessionStorage.getItem(storageKey));
 const request=useRef<string|null>(sessionStorage.getItem(storageKey));
 const running=useRef(false), alive=useRef(true), selectedId=useRef('');
 const statuses=useRef(new Map<string,GroupAnalysisStatus>());
 const hasRunning=runs.some(run=>run.STATUS==='RUNNING');
 useEffect(()=>{selectedId.current=selected?.ANALYSIS_ID ?? '';},[selected?.ANALYSIS_ID]);
 useEffect(()=>{
  let current=true;alive.current=true;let polling=false;
  const load=async()=>{
   if(polling)return;polling=true;
   try {
    const list=await api.analyses(group.REQUIREMENT_GROUP_ID);if(!current)return;
    const completed=list.find(run=>statuses.current.get(run.ANALYSIS_ID)==='RUNNING' && run.STATUS!=='RUNNING');
    if(completed)setNotice(succeeded(completed) ? '분석이 완료되었습니다. 결과와 근거를 검토하세요.' : `분석이 종료되었습니다: ${labels[completed.STATUS]}`);
    statuses.current=new Map(list.map(run=>[run.ANALYSIS_ID,run.STATUS]));setRuns(list);
    const recovered=request.current ? list.find(run=>run.REQUEST_ID===request.current):undefined;
    const target=recovered ?? list.find(run=>run.ANALYSIS_ID===selectedId.current) ?? list[0];
    if(target){const result=await api.analysis(group.REQUIREMENT_GROUP_ID,target.ANALYSIS_ID);if(current)setSelected(result);}
    if(recovered){request.current=null;sessionStorage.removeItem(storageKey);setPendingRequest(false);}
   }catch{if(current)setError('실행 상태를 조회하지 못했습니다. 연결이 복구되면 다시 확인합니다.');}
   finally{polling=false;}
  };
  void load();
  const timer=hasRunning || request.current ? window.setInterval(()=>void load(),2500):undefined;
  return()=>{current=false;alive.current=false;if(timer)window.clearInterval(timer);};
 },[group.REQUIREMENT_GROUP_ID,storageKey,hasRunning,pendingRequest]);
 const operate=async(work:()=>Promise<void>)=>{
  if(running.current)return;running.current=true;setBusy(true);setError('');
  try{await work();}catch(e){if(alive.current)setError(e instanceof Error ? e.message:'요청 결과를 확인하지 못했습니다. 실행 이력을 조회하세요.');}
  finally{running.current=false;if(alive.current)setBusy(false);}
 };
 const refresh=()=>void operate(async()=>{
  const list=await api.analyses(group.REQUIREMENT_GROUP_ID);if(!alive.current)return;setRuns(list);
  const found=request.current ? list.find(run=>run.REQUEST_ID===request.current):undefined;
  const target=found ?? list.find(run=>run.ANALYSIS_ID===selectedId.current) ?? list[0];
  if(target){const result=await api.analysis(group.REQUIREMENT_GROUP_ID,target.ANALYSIS_ID);if(alive.current)setSelected(result);}
  if(found){request.current=null;sessionStorage.removeItem(storageKey);setPendingRequest(false);}
 });
 const execute=()=>void operate(async()=>{
  request.current ??=crypto.randomUUID();sessionStorage.setItem(storageKey,request.current);setPendingRequest(true);
  const result=await api.analyze(group.REQUIREMENT_GROUP_ID,group.VERSION,request.current);
  request.current=null;sessionStorage.removeItem(storageKey);setPendingRequest(false);if(!alive.current)return;
  selectedId.current=result.ANALYSIS_ID;setSelected(result);
  statuses.current.set(result.ANALYSIS_ID,result.STATUS);
  setRuns(previous=>[result,...previous.filter(run=>run.ANALYSIS_ID!==result.ANALYSIS_ID)]);
  setNotice(result.STATUS==='RUNNING' ? '분석을 실행했습니다. 다른 작업을 계속할 수 있습니다. 이 창에서 완료 상태를 자동 확인합니다.' : labels[result.STATUS]);
 });
 const checkConnection=()=>void operate(async()=>{
  setConnection(null);const started=performance.now();const result=await testCompanyLlm('Reply with only OK. No explanation. /no_think');
  if(alive.current)setConnection({content:result.CONTENT,model:result.MODEL,elapsedMs:Math.round(performance.now()-started)});
 });
 const response=selected?.RESPONSE;
 const sections=response?.businessAreas ? [['businessAreas','업무영역'],['processCandidates','프로세스 후보'],['programCandidates','Program 후보']] as const : [['businessStructure','기존 업무 구조'],['processes','기존 프로세스'],['screenCandidates','기존 화면 후보'],['programCandidates','기존 Program 후보']] as const;
 return <FormModal open title="그룹 개요 분석 V0" submitting={busy} onClose={onClose} footerActions={<div className="grid-toolbar">
  <ActionButton actionCode="EXECUTE" label="짧은 응답 확인" disabled={busy} onClick={checkConnection} />
  <ActionButton actionCode="EXECUTE" label={pendingRequest ? '실행 요청 재확인':'분석 실행'} disabled={busy || group.GROUP_STATUS!=='CONFIRMED' || !group.HAS_ANALYSIS_SNAPSHOT || hasRunning} onClick={execute} />
  <ActionButton actionCode="SEARCH" label="실행 이력 조회" disabled={busy} onClick={refresh} />
 </div>}>
  <p>확정된 요구사항 원문으로 짧은 개요를 분석합니다. 결과는 검토용 제안이며 자동 채택되지 않습니다.</p>
  {notice ? <BaseKitMessage type="info" message={notice} />:null}
  {connection ? <BaseKitMessage type="success" message={`연결 확인 응답: ${connection.content}`} detail={`${connection.model} · ${(connection.elapsedMs/1000).toFixed(1)}초 · 그룹 원문 전송 없음`} />:null}
  {!group.HAS_ANALYSIS_SNAPSHOT ? <BaseKitMessage type="warn" message="확정 시점 Snapshot이 없습니다. 검토 후 재확정하세요." />:null}
  {error ? <BaseKitMessage type="error" message={error} />:null}
  <div className="standard-form-grid"><FormField label="실행 이력" labelPosition="TOP" className="form-full-row"><select aria-label="그룹 분석 실행 이력" disabled={busy} value={selected?.ANALYSIS_ID ?? ''} onChange={e=>{const id=e.target.value;if(id)void operate(async()=>{selectedId.current=id;const result=await api.analysis(group.REQUIREMENT_GROUP_ID,id);if(alive.current)setSelected(result);});}}>
   <option value="">실행 선택</option>{runs.map(run=><option key={run.ANALYSIS_ID} value={run.ANALYSIS_ID}>{run.CREATED_AT} · {labels[run.STATUS]} · {run.ANALYSIS_ID}</option>)}
  </select></FormField></div>
  {selected ? <><p>{labels[selected.STATUS]} · v{selected.GROUP_VERSION} · {selected.MODEL_NAME} · {selected.PROMPT_VERSION}{selected.ELAPSED_MS!=null ? ` · ${(selected.ELAPSED_MS/1000).toFixed(1)}초`:''}</p>
   {selected.ERROR_MESSAGE ? <BaseKitMessage type="error" message={selected.ERROR_MESSAGE} />:null}
   {selected.STATUS==='RUNNING' ? <BaseKitMessage type="info" message="분석 중입니다. 창을 닫고 다른 작업을 계속할 수 있습니다. 완료 상태는 자동 조회합니다." />:null}
   {selected.WARNINGS?.length ? <section><h3>근거 검토</h3><ul>{selected.WARNINGS.map((warning,index)=><li key={index}>{warning}</li>)}</ul></section>:null}
   {response ? <><section><h3>요약</h3><p>{response.summary.text}</p></section>{sections.map(([key,title])=><section key={key}><h3>{title} ({response[key]?.length ?? 0})</h3>{response[key]?.map((item,index)=><div key={index}><strong>{String(item.name ?? item.title ?? `후보 ${index+1}`)}</strong><p>{String(item.description ?? item.purpose ?? '')}</p><p>근거: {Array.isArray(item.evidenceRequirementIds) ? item.evidenceRequirementIds.join(', '):'확인 필요'}</p></div>)}</section>)}<section><h3>확인 필요 사항</h3><ul>{response.observations.map((item,index)=><li key={index}>{typeof item==='string' ? item:JSON.stringify(item)}</li>)}</ul></section></>:null}
   <details><summary>입력 Snapshot JSON</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.REQUEST_JSON}</pre></details>
   <details><summary>수신 원문 (HTTP 응답 / 기존 분석 원문)</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.RESPONSE_RAW_JSON ?? '응답 원문이 아직 없습니다.'}</pre></details>
  </>:<p>저장된 분석 실행이 없습니다.</p>}
 </FormModal>;
}
