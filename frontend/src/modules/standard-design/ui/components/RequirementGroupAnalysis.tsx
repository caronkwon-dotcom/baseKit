import { useLocation } from 'react-router-dom';
import { designReviewUrl } from '../../requirementgroup/designReview';
import GroupAnalysisReport from './GroupAnalysisReport';
import './groupAnalysis.css';
import { adaptGroupAnalysis } from '../../requirementgroup/groupAnalysisAdapter';
import { createUuid } from '../../../../utils/uuid';
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
export default function RequirementGroupAnalysis({group,onClose,projectName,embedded=false,blocked=false,initialAnalysisId}:{group:RequirementGroup;onClose:()=>void;projectName?:string;embedded?:boolean;blocked?:boolean;initialAnalysisId?:string}) {
 const {pathname}=useLocation();
 const [runs,setRuns]=useState<GroupAnalysis[]>([]), [selected,setSelected]=useState<GroupAnalysis|null>(null);
 const [analysisType,setAnalysisType]=useState(()=>sessionStorage.getItem(`basekit:group-analysis-request:${group.REQUIREMENT_GROUP_ID}:type`) ?? 'GROUP_RECOMMENDATION');
 const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
 const [connection,setConnection]=useState<{content:string;elapsedMs:number;model:string}|null>(null);
 const storageKey=`basekit:group-analysis-request:${group.REQUIREMENT_GROUP_ID}`;
 const [pendingRequest,setPendingRequest]=useState(()=>!!sessionStorage.getItem(storageKey));
 const request=useRef<string|null>(sessionStorage.getItem(storageKey));
 const requestVersion=useRef<number>(Number(sessionStorage.getItem(`${storageKey}:version`)) || group.VERSION);
 const running=useRef(false), alive=useRef(true), selectedId=useRef(initialAnalysisId ?? '');
 const statuses=useRef(new Map<string,GroupAnalysisStatus>());
 const hasRunning=runs.some(run=>run.STATUS==='RUNNING');
 useEffect(()=>{if(selected)selectedId.current=selected.ANALYSIS_ID;},[selected]);
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
  if(!request.current) {request.current=createUuid();requestVersion.current=group.VERSION;}
  sessionStorage.setItem(`${storageKey}:type`,analysisType);sessionStorage.setItem(storageKey,request.current);sessionStorage.setItem(`${storageKey}:version`,String(requestVersion.current));setPendingRequest(true);
  const result=await api.analyze(group.REQUIREMENT_GROUP_ID,requestVersion.current,request.current,projectName,analysisType);
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
 const display=selected ? adaptGroupAnalysis(selected):null;
 const actions=<div className="sd-analysis-controls">

  <label>분석 유형<select aria-label="분석 유형" value={analysisType} disabled={busy || pendingRequest} onChange={e=>setAnalysisType(e.target.value)}><option value="GROUP_RECOMMENDATION">그룹 보완 · 요구사항 추천</option><option value="GROUP_DESIGN">그룹 설계 · 업무 구조 제안</option></select></label>
  <ActionButton actionCode="EXECUTE" label={pendingRequest ? '실행 요청 재확인':'분석 실행'} disabled={busy || blocked || !group.REQUIREMENT_GROUP_ID || !group.MEMBERS.length || hasRunning} onClick={execute} />

 </div>;
 const content=<>
  <p className="sd-analysis-help">{analysisType === 'GROUP_RECOMMENDATION' ? '현재 그룹에 추가할 요구사항과 추천 사유를 검토합니다.' : '현재 그룹의 업무영역·프로세스·프로그램 후보를 검토합니다.'} 결과를 검토한 후 기본정보에서 반영하세요.</p>
  {notice ? <BaseKitMessage type="info" message={notice} />:null}

  {blocked ? <BaseKitMessage type="warn" message="기본정보에서 변경 내용을 저장한 후 분석을 실행하세요." />:null}
  {error ? <BaseKitMessage type="error" message={error} />:null}
  <div className="sd-analysis-controls"><FormField label="실행 이력" labelPosition="TOP" className="sd-analysis-history"><select aria-label="그룹 분석 실행 이력" disabled={busy} value={selected?.ANALYSIS_ID ?? ''} onChange={e=>{const id=e.target.value;if(id)void operate(async()=>{selectedId.current=id;const result=await api.analysis(group.REQUIREMENT_GROUP_ID,id);if(alive.current)setSelected(result);});}}>
   <option value="">실행 선택</option>{runs.map(run=><option key={run.ANALYSIS_ID} value={run.ANALYSIS_ID}>{run.ANALYSIS_TYPE==='GROUP_RECOMMENDATION' ? '그룹 보완':'그룹 설계'} · {new Date(run.CREATED_AT).toLocaleString('ko-KR')} · {labels[run.STATUS]} · v{run.GROUP_VERSION}</option>)}
  </select></FormField><ActionButton actionCode="SEARCH" label="이력 새로고침" disabled={busy} onClick={refresh} /></div>
  {selected?.ANALYSIS_TYPE==='GROUP_DESIGN' && succeeded(selected) && <p><a href={designReviewUrl(group.PROJECT_ID,group.REQUIREMENT_GROUP_ID,selected.ANALYSIS_ID,pathname)} target="_blank" rel="noreferrer">설계 초안 검토 열기 · 읽기 전용 ↗</a></p>}
  {selected ? <><p className="sd-analysis-help">{labels[selected.STATUS]} · 그룹 버전 {selected.GROUP_VERSION}{selected.ELAPSED_MS!=null ? ` · ${(selected.ELAPSED_MS/1000).toFixed(1)}초`:''}</p>
   {selected.ERROR_MESSAGE ? <BaseKitMessage type="error" message={selected.ERROR_MESSAGE} />:null}
   {selected.STATUS==='RUNNING' ? <BaseKitMessage type="info" message="분석 중입니다. 창을 닫고 다른 작업을 계속할 수 있습니다. 완료 상태는 자동 조회합니다." />:null}
   {display?.WARNINGS.length ? <section><h3>근거 검토</h3><ul>{display.WARNINGS.map((warning,index)=><li key={index}>{warning}</li>)}</ul></section>:null}
   {display ? <GroupAnalysisReport display={display} loading={selected.STATUS==='RUNNING'} title={`${group.REQUIREMENT_GROUP_NAME} · ${selected.ANALYSIS_TYPE==='GROUP_RECOMMENDATION' ? '요구사항 추천':'그룹 설계'}`} /> : null}
   <details className="sd-analysis-technical"><summary>분석 원본 및 실행 정보</summary><p>{selected.ANALYSIS_ID} · {selected.MODEL_NAME} · {selected.PROMPT_VERSION}</p>
   {display?.SOURCE.RESPONSE_JSON ? <details><summary>분석 결과 JSON</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{display.SOURCE.RESPONSE_JSON}</pre></details>:null}
   <details><summary>입력 Snapshot JSON</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.REQUEST_JSON}</pre></details>
   <details><summary>수신 원문 (HTTP 응답 / 기존 분석 원문)</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{selected.RESPONSE_RAW_JSON ?? '응답 원문이 아직 없습니다.'}</pre></details>
   </details>
  </>:<p>저장된 분석 실행이 없습니다. 분석 유형을 선택하고 실행하세요.</p>}
 </>;
 const diagnostics=<details className="sd-analysis-technical"><summary>연결 진단</summary><p>그룹 원문을 전송하지 않는 짧은 응답 테스트입니다.</p><ActionButton actionCode="EXECUTE" label="짧은 응답 확인" disabled={busy} onClick={checkConnection} />{connection ? <BaseKitMessage type="success" message={`연결 확인 응답: ${connection.content}`} detail={`${connection.model} · ${(connection.elapsedMs/1000).toFixed(1)}초`} /> : null}</details>;
 const body=<div className="sd-group-analysis"><div className="sd-menu-design-entry"><a className="action-button primary" href={`/baseKit/#/standard-design/prototypes/menu-builder?project=${encodeURIComponent(group.PROJECT_ID)}`} target="_blank" rel="noreferrer">AI 메뉴 초안 열기 · 메뉴 설계 ↗</a><p className="sd-analysis-help">현재 프로젝트의 그룹 분석 후보를 메뉴 설계에서 구성·편집합니다. 새 창으로 열리며 메뉴 확정·DB 등록은 수행하지 않습니다.</p></div>{actions}{content}{diagnostics}</div>;
 return embedded ? body : <FormModal open title="그룹 분석" submitting={busy} onClose={onClose}>{body}</FormModal>;
}
