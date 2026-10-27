import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { adaptGroupAnalysis } from '../../requirementgroup/groupAnalysisAdapter';
import { analysisEvidence, groupAnalysisUrl, loadDesignReview } from '../../requirementgroup/designReview';
import './designReview.css';

type Review = Awaited<ReturnType<typeof loadDesignReview>>;
const definitions = [
 ['businessAreas','업무영역','business'], ['processCandidates','프로세스 후보','process'], ['programCandidates','프로그램 후보','program'],
 ['businessStructure','기존 업무 구조','legacy'], ['processes','기존 프로세스','legacy'], ['screenCandidates','기존 화면 후보','legacy'],
] as const;
function Alert({children,error=false}:{children:React.ReactNode;error?:boolean}) {
 return <div className={'alert'+(error?' error':'')} role={error?'alert':'status'}><span className="ico" aria-hidden="true"><span>!</span></span><div>{children}</div></div>;
}
export default function DesignReviewPage() {
 const [params,setParams]=useSearchParams(); const {pathname}=useLocation();
 const project=params.get('project') ?? '', group=params.get('group') ?? '', analysis=params.get('analysis') ?? '';
 const [state,setState]=useState<{key:string;data?:Review;error?:string}>({key:''});
 const [selection,setSelection]=useState({key:'',section:'all'});
 const key=JSON.stringify([project,group,analysis]);
 const selected=selection.key===key?selection.section:'all';
 useEffect(()=>{let active=true;void loadDesignReview(project,group,analysis).then(data=>{if(active)setState({key,data});}).catch(error=>{if(active)setState({key,error:error instanceof Error ? error.message : '조회 실패'});});return()=>{active=false;};},[project,group,analysis,key]);
 const loaded=state.key===key;
 const data=loaded ? state.data : undefined;
 let evidence: ReturnType<typeof analysisEvidence> | undefined, snapshotError='';
 if(data) try {evidence=analysisEvidence(data.analysis,data.requirements,project,group);} catch(error) {snapshotError=error instanceof Error ? error.message : '입력 스냅샷 오류';}
 const display=data && !snapshotError ? adaptGroupAnalysis(data.analysis, '이름 미제공') : undefined;
 const success=data && ['SUCCESS','SUCCEEDED'].includes(data.analysis.STATUS);
 const sections=definitions.filter(([id,,kind])=>kind!=='legacy'||display?.SECTIONS.some(section=>section.KEY===id));
 const count=(id:string)=>display?.SECTIONS.find(section=>section.KEY===id)?.ITEMS.length??0;
 return <section className="sd-design-review" aria-label="설계 초안 검토">
  <div className="page-head"><div><div className="eyebrow">DESIGN DRAFT / REVIEW</div><h1>설계 초안 검토 <span className="badge">읽기 전용</span></h1><p className="sub">분석 결과의 설계 후보입니다. 설계가 확정된 상태가 아닙니다.</p></div>
   {data && <div className="picker"><label htmlFor="design-analysis-select">분석 버전 · GROUP_DESIGN 실행 이력</label><select id="design-analysis-select" aria-label="설계 검토 분석 이력" value={analysis} onChange={event=>{const next=new URLSearchParams(params);next.set('analysis',event.target.value);setParams(next);}}>
    {!data.runs.some(run=>run.ANALYSIS_ID===analysis) && <option value={analysis}>{analysis} · 목록에 없는 지정 기록</option>}
    {data.runs.map(run=><option key={run.ANALYSIS_ID} value={run.ANALYSIS_ID}>{run.CREATED_AT} · 그룹 v{run.GROUP_VERSION} · {run.STATUS} · {run.ANALYSIS_ID}</option>)}
   </select>{!data.runs.length && <p>GROUP_DESIGN 실행 이력 목록이 없습니다.</p>}</div>}
  </div>
  {!loaded && <p role="status">분석 기록 조회 중…</p>}
  {loaded && state.error && <Alert error><p>권한/API 또는 기록 조회 오류: {state.error}</p></Alert>}
  {snapshotError && <Alert error><p>{snapshotError}</p></Alert>}
  {data && <>
   <section className="context-panel" aria-label="검토 대상"><dl className="context">
    <div className="cell lead"><dt>요구사항 그룹</dt><dd>{data.group.REQUIREMENT_GROUP_NAME} · {group}</dd></div>
    <div className="cell"><dt>프로젝트</dt><dd className="mono">{project}</dd></div>
    <div className="cell"><dt>분석 ID</dt><dd className="mono">{data.analysis.ANALYSIS_ID}</dd></div>
    <div className="cell"><dt>그룹 버전 · 상태</dt><dd>현재 v{data.group.VERSION}<span className="pill">{data.group.GROUP_STATUS}</span></dd></div>
    <div className="cell"><dt>분석 기준 · 실행 상태</dt><dd>그룹 v{data.analysis.GROUP_VERSION}<span className={'pill '+(success?'ok':data.analysis.STATUS==='RUNNING'?'run':'fail')}>{data.analysis.STATUS}</span></dd></div>
    <div className="cell"><dt>실행 · 완료</dt><dd className="mono">{data.analysis.CREATED_AT}<br/>{data.analysis.COMPLETED_AT || '완료 시각 미제공'}</dd></div>
   </dl><p className="return"><a href={groupAnalysisUrl(project,group,analysis,pathname)}>요구사항 그룹관리 · 동일 그룹 · 선택한 분석 탭으로 돌아가기</a></p></section>
   {data.group.VERSION!==data.analysis.GROUP_VERSION && <Alert><p>낡은 분석: 현재 그룹 v{data.group.VERSION}와 분석 기준 v{data.analysis.GROUP_VERSION}가 다릅니다. 선택한 실행의 입력을 그대로 표시합니다.</p></Alert>}
   {data.analysis.STATUS==='RUNNING' && <div className="alert info" role="status">분석 실행 중입니다. 완료 후 새로고침하세요. 이 화면에서는 상태를 변경하지 않습니다.</div>}
   {!success && data.analysis.STATUS!=='RUNNING' && <Alert error><p>실패한 분석입니다: {data.analysis.STATUS}</p></Alert>}
   {data.analysis.ERROR_MESSAGE && <Alert error><p>{data.analysis.ERROR_MESSAGE}</p></Alert>}
   {display && <>
    {(display.WARNINGS.length>0 || !!evidence?.WARNINGS.length) && <Alert><p>분석 결과 및 근거 확인</p><ul>{[...display.WARNINGS,...(evidence?.WARNINGS??[])].map((warning,index)=><li key={index}>{warning}</li>)}</ul></Alert>}
    {success && <>
     <section className="summary"><span className="ico" aria-hidden="true">✦</span><div><h2>요약</h2><p>{display.SUMMARY || '등록된 내용 없음'}</p></div></section>
     <div className="dr-workspace" key={key}><aside className="nav-panel" aria-label="설계 후보 탐색"><h2>설계 후보</h2><nav className="section-nav" aria-label="설계 후보 섹션"><button type="button" aria-pressed={selected==='all'} onClick={()=>setSelection({key,section:'all'})}>전체 보기</button><hr/>{sections.map(([id,title,kind])=><button key={id} type="button" data-kind={kind} aria-pressed={selected===id} onClick={()=>setSelection({key,section:id})}><span className="lab"><span className="dot"/>{title}</span><span className="cnt">{count(id)}</span></button>)}</nav><p className="hint">섹션을 선택하면 해당 후보만 표시합니다.</p></aside>
      <div className="results">{sections.map(([id,title,kind])=><section className="block" data-kind={kind} key={id} hidden={selected!=='all'&&selected!==id} aria-label={title}><div className="block-head"><h3>{title}</h3><span className="section-key">{id} · {count(id)}건</span></div>
       {!count(id) ? <p className="empty">등록된 내용 없음</p> : display.SECTIONS.find(section=>section.KEY===id)!.ITEMS.map((item,index)=><article className="cand" key={index}><div className="cand-head"><span className="idx">{String(index+1).padStart(2,'0')}</span><div><h4>{item.TITLE}</h4>{kind==='process' && item.DESCRIPTION.includes('→') ? <ol className="steps">{item.DESCRIPTION.split('→').map((step,i)=><li key={i}><span>{step.trim()}</span></li>)}</ol> : <p className="desc">{item.DESCRIPTION || '등록된 내용 없음'}</p>}</div></div>
        <div className="ev-wrap"><p className="ev-title">근거 요구사항 <span className="n">{item.EVIDENCE_REQUIREMENT_IDS.length}건</span></p>{!item.EVIDENCE_REQUIREMENT_IDS.length && <p className="muted">미제공</p>}{item.EVIDENCE_REQUIREMENT_IDS.map((rid,i)=>{const source=evidence?.ROWS.find(row=>row.REQUIREMENT_ID===rid);return <details className="evidence" key={rid+i}><summary><span className="rid">{rid}</span><span className="rname">{source?.NAME || '분석 당시 명칭 미제공'}</span><span className="revs"><span className="rev">근거 Rev {source?.REVISION??'미제공'}</span><span className="rev">현재 Rev {source?.CURRENT_REVISION??'미제공'}</span>{source?.STALE && <span className="pill warn">낡은 분석</span>}</span><span className="chev" aria-hidden="true">⌄</span></summary><div className="detail-body"><span className="lbl">분석 당시 요구사항 본문</span><p>{source?.DESCRIPTION || '분석 입력 본문 미제공'}</p><span className="lbl">업무 프로세스 설명</span><p>{source?.PROCESS_DESCRIPTION || '분석 입력 프로세스 설명 미제공'}</p>{source?.STALE && <Alert><p>현재 Rev 변경·폐기 또는 현재 요구사항 없음. 분석 당시 내용을 표시합니다.</p></Alert>}{!source && <p className="muted">분석 입력에 이 근거 요구사항이 없습니다. 현재 내용으로 대체하지 않습니다.</p>}</div></details>;})}</div>
       </article>)}
      </section>)}</div>
     </div>
    </>}
   </>}
   <section className="panel"><h2>분석 원본</h2><p className="muted">선택한 실행의 입력과 응답을 보존합니다. 현재 요구사항 내용으로 대체하지 않습니다.</p>{[['분석 입력 스냅샷 · REQUEST_JSON',data.analysis.REQUEST_JSON],['HTTP 수신 원문 · RESPONSE_RAW_JSON',data.analysis.RESPONSE_RAW_JSON],['파싱 결과 · RESPONSE 및 실행 DTO',JSON.stringify(data.analysis,null,2)]].map(([title,value])=><details className="raw" key={title}><summary>{title}</summary><div className="inner"><pre>{value || '미제공'}</pre></div></details>)}<details className="raw"><summary>보조 정보 · 관찰 의견 및 실행 진단</summary><div className="inner diag"><p>모델 {data.analysis.MODEL_NAME} · 프롬프트 {data.analysis.PROMPT_VERSION}</p><p>HTTP {data.analysis.HTTP_STATUS??'미제공'} · 완료 사유 {data.analysis.FINISH_REASON??'미제공'} · 소요 {data.analysis.ELAPSED_MS??'미제공'} ms</p><p>입력 / 출력 토큰 {data.analysis.INPUT_TOKENS??'미제공'} / {data.analysis.OUTPUT_TOKENS??'미제공'}</p>{display?.OBSERVATIONS.map((text,index)=><p className="obs" key={index}>{text}</p>)}</div></details></section>
  </>}
  {!data && <a href={groupAnalysisUrl(project,group,analysis,pathname)}>요구사항 그룹관리 · 분석으로 돌아가기</a>}
 </section>;
}
