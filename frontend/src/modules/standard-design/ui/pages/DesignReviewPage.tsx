import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { BaseKitMessage } from '../../../../components/common';
import { adaptGroupAnalysis } from '../../requirementgroup/groupAnalysisAdapter';
import { analysisEvidence, groupAnalysisUrl, loadDesignReview } from '../../requirementgroup/designReview';

type Review = Awaited<ReturnType<typeof loadDesignReview>>;
export default function DesignReviewPage() {
 const [params,setParams]=useSearchParams(); const {pathname}=useLocation();
 const project=params.get('project') ?? '', group=params.get('group') ?? '', analysis=params.get('analysis') ?? '';
 const [state,setState]=useState<{key:string;data?:Review;error?:string}>({key:''});
 const key=JSON.stringify([project,group,analysis]);
 useEffect(()=>{let active=true;void loadDesignReview(project,group,analysis).then(data=>{if(active)setState({key,data});}).catch(error=>{if(active)setState({key,error:error instanceof Error ? error.message : '조회 실패'});});return()=>{active=false;};},[project,group,analysis,key]);
 const loaded=state.key===key;
 const data=loaded ? state.data : undefined;
 let evidence: ReturnType<typeof analysisEvidence> | undefined, snapshotError='';
 if(data) try {evidence=analysisEvidence(data.analysis,data.requirements,project,group);} catch(error) {snapshotError=error instanceof Error ? error.message : '입력 스냅샷 오류';}
 const display=data && !snapshotError ? adaptGroupAnalysis(data.analysis, '이름 미제공') : undefined;
 const success=data && ['SUCCESS','SUCCEEDED'].includes(data.analysis.STATUS);
 return <section className="sd-group-analysis" aria-label="설계 초안 검토">
  <h1>설계 초안 검토</h1><p>읽기 전용 · 분석 결과의 설계 후보입니다. 설계가 확정된 상태가 아닙니다.</p>
  <p>프로젝트 {project || '미지정'} · 그룹 {group || '미지정'} · 분석 {analysis || '미지정'}</p>
  <a href={groupAnalysisUrl(project,group,analysis,pathname)}>요구사항 그룹관리 · 분석으로 돌아가기</a>
  {!loaded && <p role="status">분석 기록 조회 중…</p>}
  {loaded && state.error && <BaseKitMessage type="error" message={'권한/API 또는 기록 조회 오류: '+state.error} />}
  {snapshotError && <BaseKitMessage type="error" message={snapshotError} />}
  {data && <>
   <h2>{data.group.REQUIREMENT_GROUP_NAME}</h2>
   <p>현재 그룹 v{data.group.VERSION} · 그룹 상태 {data.group.GROUP_STATUS} · 분석 기준 그룹 v{data.analysis.GROUP_VERSION} · 분석 상태 {data.analysis.STATUS}</p>
   <p>실행 {data.analysis.CREATED_AT} · 완료 {data.analysis.COMPLETED_AT || '미제공'}</p>
   <label>분석 버전 <select aria-label="설계 검토 분석 이력" value={analysis} onChange={event=>{const next=new URLSearchParams(params);next.set('analysis',event.target.value);setParams(next);}}>
    {!data.runs.some(run=>run.ANALYSIS_ID===analysis) && <option value={analysis}>{analysis} · 목록에 없는 지정 기록</option>}
    {data.runs.map(run=><option key={run.ANALYSIS_ID} value={run.ANALYSIS_ID}>{run.CREATED_AT} · v{run.GROUP_VERSION} · {run.STATUS} · {run.ANALYSIS_ID}</option>)}
   </select></label>
   {!data.runs.length && <p>GROUP_DESIGN 실행 이력 목록이 없습니다.</p>}
   {data.group.VERSION!==data.analysis.GROUP_VERSION && <BaseKitMessage type="warn" message="낡은 분석: 현재 그룹 버전과 다릅니다. 선택한 실행의 입력을 그대로 표시합니다." />}
   {data.analysis.STATUS==='RUNNING' && <p role="status">분석 실행 중입니다. 완료 후 새로고침하세요. 이 화면에서는 상태를 변경하지 않습니다.</p>}
   {!success && data.analysis.STATUS!=='RUNNING' && <BaseKitMessage type="error" message={'실패한 분석입니다: '+data.analysis.STATUS} />}
   {data.analysis.ERROR_MESSAGE && <BaseKitMessage type="error" message={data.analysis.ERROR_MESSAGE} />}
   {display && <>
    {[...display.WARNINGS,...(evidence?.WARNINGS ?? [])].map((warning,index)=><BaseKitMessage key={index} type="warn" message={warning} />)}
    {success && <><h2>요약</h2><p>{display.SUMMARY || '등록된 내용 없음'}</p>
     {(['businessAreas','processCandidates','programCandidates','businessStructure','processes','screenCandidates'] as const).map(sectionKey=>{
      const section=display.SECTIONS.find(item=>item.KEY===sectionKey);
      const title={businessAreas:'업무 영역',processCandidates:'프로세스 후보',programCandidates:'프로그램 후보',businessStructure:'기존 업무 구조',processes:'기존 프로세스',screenCandidates:'기존 화면 후보'}[sectionKey];
      if(!section && ['businessStructure','processes','screenCandidates'].includes(sectionKey))return null;
      return <section key={sectionKey}><h2>{title}</h2>{!section?.ITEMS.length ? <p>등록된 내용 없음</p> : <ul>{section.ITEMS.map((item,index)=><li key={index}>
       <h3>{item.TITLE}</h3><p>{item.DESCRIPTION || '등록된 내용 없음'}</p>
       <p>근거 요구사항</p>{!item.EVIDENCE_REQUIREMENT_IDS.length ? <p>미제공</p> : <ul>{item.EVIDENCE_REQUIREMENT_IDS.map((id,index)=>{
        const source=evidence?.ROWS.find(row=>row.REQUIREMENT_ID===id);
        return <li key={id+index}><details><summary>{id} · {source?.NAME || '분석 당시 명칭 미제공'} · 근거 Rev {source?.REVISION ?? '미제공'} · 현재 Rev {source?.CURRENT_REVISION ?? '미제공'}</summary>
         <p>{source?.DESCRIPTION || '분석 입력 본문 미제공'}</p><p>{source?.PROCESS_DESCRIPTION || '분석 입력 프로세스 설명 미제공'}</p>
         {!source && <p>분석 입력에 이 근거 요구사항이 없습니다. 현재 내용으로 대체하지 않습니다.</p>}
        </details></li>;
       })}</ul>}
      </li>)}</ul>}</section>;
     })}</>}
   </>}
   <details><summary>분석 입력 스냅샷 · 원본 실행 정보</summary><p>{data.analysis.MODEL_NAME} · {data.analysis.PROMPT_VERSION}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{data.analysis.REQUEST_JSON || '입력 스냅샷 미제공'}</pre><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{data.analysis.RESPONSE_RAW_JSON || '응답 원문 미제공'}</pre></details>
  </>}
 </section>;
}
