import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import FormModal from '../../../components/common/FormModal';
import PageHeader from '../../../components/common/PageHeader';
import ProjectContextSelector from '../ui/components/ProjectContextSelector';
import { useProjectContext } from '../ui/components/useProjectContext';
import { requirementGroupApi, type RequirementGroup } from '../requirementgroup/requirementGroupApi';
import type { GroupAnalysis } from '../requirementgroup/groupAnalysis.types';
import { designReviewUrl } from '../requirementgroup/designReview';
import { designProgramApi as api, type DesignProgram, type ProgramCandidate } from './designProgramApi';
import './programRegister.css';

function snapshotText(raw:string){try{const snapshot=JSON.parse(raw) as {name?:string;description?:string;processDescription?:string};return [snapshot.name,snapshot.description,snapshot.processDescription].filter(Boolean).join('\n\n');}catch{return '분석 당시 근거를 읽을 수 없습니다.';}}
function CandidatePicker({project,initialGroup,initialAnalysis,onClose,onSaved}:{project:string;initialGroup:string;initialAnalysis:string;onClose:()=>void;onSaved:()=>Promise<void>}) {
 const [groups,setGroups]=useState<RequirementGroup[]>([]),[group,setGroup]=useState(initialGroup),[analysis,setAnalysis]=useState(initialAnalysis),[runs,setRuns]=useState<GroupAnalysis[]>([]);
 const [candidates,setCandidates]=useState<ProgramCandidate[]>([]),[selected,setSelected]=useState(new Set<number>()),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;requirementGroupApi.list(project).then(rows=>{if(active)setGroups(rows);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[project]);
 useEffect(()=>{let active=true;if(group)requirementGroupApi.readOnlyAnalyses(group).then(rows=>{if(active)setRuns(rows.filter(r=>r.ANALYSIS_TYPE==='GROUP_DESIGN'));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[group]);
 useEffect(()=>{let active=true;if(group&&analysis){api.candidates(project,group,analysis).then(rows=>{if(active){setCandidates(rows);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});}return()=>{active=false;};},[project,group,analysis]);
 const adopt=async()=>{setBusy(true);setError('');try{await api.adopt(project,group,analysis,[...selected]);await onSaved();onClose();}catch(e){setError(e instanceof Error?e.message:'등록에 실패했습니다.');try{setCandidates(await api.candidates(project,group,analysis));setSelected(new Set());}catch{/* Keep original error. */}}finally{setBusy(false);}};
 return <FormModal open title="AI 후보 가져오기" onClose={onClose} submitting={busy} submitLabel="선택 후보 등록" submitDisabled={loading||!selected.size} onSubmit={()=>void adopt()}>
  <div className="sd-program-register"><label>그룹<select aria-label="후보 그룹" disabled={busy} value={group} onChange={e=>{setGroup(e.target.value);setAnalysis('');setRuns([]);setCandidates([]);setSelected(new Set());setError('');setLoading(false);}}><option value="">그룹 선택</option>{groups.map(g=><option key={g.REQUIREMENT_GROUP_ID} value={g.REQUIREMENT_GROUP_ID}>{g.REQUIREMENT_GROUP_NAME} · {g.REQUIREMENT_GROUP_ID}</option>)}</select></label>
  <label>지정 분석 이력<select aria-label="후보 분석 이력" disabled={busy||!group} value={analysis} onChange={e=>{setAnalysis(e.target.value);setCandidates([]);setSelected(new Set());setError('');setLoading(!!e.target.value);}}><option value="">분석 선택</option>{runs.map(r=><option key={r.ANALYSIS_ID} value={r.ANALYSIS_ID} disabled={!['SUCCESS','SUCCEEDED'].includes(r.STATUS)}>{r.CREATED_AT} · 그룹 v{r.GROUP_VERSION} · {r.STATUS} · {r.ANALYSIS_ID}</option>)}</select></label>
  {error&&<p role="alert">{error}</p>}{loading&&<p role="status">후보 조회 중…</p>}
  {analysis&&!loading&&!error&&!candidates.length&&<p>이 분석에는 프로그램 후보가 없습니다.</p>}
  {candidates.map(c=><article key={c.CANDIDATE_INDEX}><label><input type="checkbox" aria-label={c.PROGRAM_NAME+' 선택'} disabled={busy||!!c.PROGRAM_ID||!!c.ERROR} checked={selected.has(c.CANDIDATE_INDEX)} onChange={e=>setSelected(previous=>{const next=new Set(previous);if(e.target.checked)next.add(c.CANDIDATE_INDEX);else next.delete(c.CANDIDATE_INDEX);return next;})}/>{c.PROGRAM_NAME} {c.PROGRAM_ID?'· 등록됨':''}</label><p>{c.DESCRIPTION}</p>{c.ERROR&&<p role="alert">{c.ERROR}</p>}{!c.EVIDENCE.length&&<p>요구사항 근거 미제공</p>}{c.EVIDENCE.map(ev=><details key={ev.requirementId}><summary>{ev.requirementId} · {ev.name} · 근거 Rev {ev.revision??'미제공'}</summary><p>{ev.description}</p><p>{ev.processDescription}</p></details>)}</article>)}
  </div>
 </FormModal>;
}
export default function ProgramRegister(){
 const context=useProjectContext(),[params,setParams]=useSearchParams(),{pathname}=useLocation();
 const project=params.get('project')||context.projectId;
 return <section className="sd-program-register"><PageHeader breadcrumbs={['Standard Design','프로그램 설계 / 대장']} rightContent={<ProjectContextSelector onSelected={p=>{const next=new URLSearchParams(params);next.set('project',p.PROJECT_ID);next.delete('group');next.delete('analysis');setParams(next);}}/>}/>
  {project?<RegisterBody key={project} project={project} group={params.get('group')||''} analysis={params.get('analysis')||''} pathname={pathname}/>:<p>프로젝트를 선택하세요.</p>}
 </section>;
}
function RegisterBody({project,group,analysis,pathname}:{project:string;group:string;analysis:string;pathname:string}){
 const [rows,setRows]=useState<DesignProgram[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[picker,setPicker]=useState(false),[editor,setEditor]=useState<DesignProgram|'new'|null>(null);
 const [name,setName]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const refresh=async()=>{setRows(await api.list(project));};
 useEffect(()=>{let active=true;api.list(project).then(data=>{if(active){setRows(data);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[project]);
 const edit=(row:DesignProgram|'new')=>{setError('');setEditor(row);setName(row==='new'?'':row.PROGRAM_NAME);setDescription(row==='new'?'':row.DESCRIPTION);};
 const close=()=>{if(busy)return;if(editor&&((editor==='new'&&(name||description))||(editor!=='new'&&(name!==editor.PROGRAM_NAME||description!==editor.DESCRIPTION)))&&!window.confirm('저장하지 않은 변경을 닫을까요?'))return;setEditor(null);};
 const save=async()=>{if(!editor)return;setBusy(true);setError('');try{await api.save(project,editor==='new'?'':editor.PROGRAM_ID,{PROGRAM_NAME:name,DESCRIPTION:description,VERSION:editor==='new'?undefined:editor.VERSION});setEditor(null);setNotice('프로그램을 저장했습니다.');await refresh();}catch(e){setError(e instanceof Error?e.message:'저장에 실패했습니다.');}finally{setBusy(false);}};
 return <><h2>프로젝트별 프로그램 대장</h2><p>프로젝트 {project} · {rows.length}건</p><div className="sd-program-actions"><button type="button" className="secondary-button" onClick={()=>void refresh().catch(e=>setError(e.message))}>대장 조회</button><button type="button" className="primary-button" onClick={()=>{setError('');setPicker(true);}}>AI 후보 가져오기</button><button type="button" className="secondary-button" onClick={()=>edit('new')}>수동 프로그램 추가</button></div>
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}{loading&&<p role="status">프로그램 조회 중…</p>}
 <DataTable rows={rows} getRowKey={r=>r.PROGRAM_ID} columns={[
  {key:'id',header:'PROGRAM_ID',minWidth:170,render:r=>r.PROGRAM_ID},
  {key:'name',header:'명칭',minWidth:160,render:r=><button type="button" className="secondary-button" onClick={()=>edit(r)}>{r.PROGRAM_NAME}</button>},
  {key:'description',header:'설명',minWidth:200,render:r=>r.DESCRIPTION},
  {key:'source',header:'출처 / 근거',minWidth:240,render:r=><>{r.SOURCE_GROUP_ID&&r.SOURCE_ANALYSIS_ID?<><a target="_blank" rel="noreferrer" href={designReviewUrl(project,r.SOURCE_GROUP_ID,r.SOURCE_ANALYSIS_ID,pathname)}>그룹 {r.SOURCE_GROUP_ID} · 분석 {r.SOURCE_ANALYSIS_ID} · v{r.SOURCE_RESULT_VERSION}</a></>:r.SOURCE_ANALYSIS_ID?'기존 요구사항 분석 '+r.SOURCE_ANALYSIS_ID:'수동 추가'}{r.EVIDENCE.map(ev=><details key={ev.REQUIREMENT_ID}><summary>{ev.REQUIREMENT_ID} · 근거 Rev {ev.REQUIREMENT_REVISION??'미제공'}</summary><pre>{ev.SNAPSHOT_JSON?snapshotText(ev.SNAPSHOT_JSON):'기존 근거에는 분석 당시 스냅샷이 없습니다.'}</pre>{r.SOURCE_GROUP_ID&&r.SOURCE_ANALYSIS_ID&&<a target="_blank" rel="noreferrer" href={designReviewUrl(project,r.SOURCE_GROUP_ID,r.SOURCE_ANALYSIS_ID,pathname)}>분석 당시 요구사항 근거 보기</a>}</details>)}</>},
 ]}/>
 {picker&&<CandidatePicker project={project} initialGroup={group} initialAnalysis={analysis} onClose={()=>setPicker(false)} onSaved={async()=>{setNotice('선택 후보를 등록했습니다.');await refresh();}}/>}
 <FormModal open={!!editor} title={editor==='new'?'수동 프로그램 추가':'프로그램 편집'} submitting={busy} submitDisabled={!name.trim()||name.trim().length>300||description.length>20000} onSubmit={()=>void save()} onClose={close}>
  <div className="sd-program-register">{editor&&editor!=='new'&&<p>PROGRAM_ID: {editor.PROGRAM_ID}</p>}<label>명칭<input aria-label="프로그램 명칭" maxLength={300} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label>설명<textarea aria-label="프로그램 설명" rows={5} maxLength={20000} value={description} disabled={busy} onChange={e=>setDescription(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}</div>
 </FormModal></>;
}
