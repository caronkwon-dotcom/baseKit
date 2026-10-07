import RequirementGroupAnalysis from '../components/RequirementGroupAnalysis';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton, BaseKitMessage, DataTable, FormModal, MasterDetailMultiGrid, PageHeader, SearchPanel, type DataTableColumn } from '../../../../components/common';
import FormField from '../../../../components/common/FormField';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import ProjectContextSelector from '../components/ProjectContextSelector';
import { useProjectContext } from '../components/useProjectContext';
import { requirementApi, type Requirement } from '../../requirement/requirementApi';
import { groupInput, groupStatusLabels, mergeGroupMembers, requirementGroupApi as api, type GroupInput, type GroupMember, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import { requirementRecommendationApi, type RequirementRecommendation } from '../../requirementgroup/requirementRecommendationApi';

import { groupMemberRowState } from '../../requirementgroup/requirementGroupRowState';

const empty=(project:string):RequirementGroup=>({REQUIREMENT_GROUP_ID:'',PROJECT_ID:project,REQUIREMENT_GROUP_NAME:'',DESCRIPTION:'',GROUP_STATUS:'DRAFT',VERSION:0,REQUEST_ID:crypto.randomUUID(),MEMBERS:[]});
const signature=(g:RequirementGroup)=>JSON.stringify(groupInput(g));
interface Candidate { KEY:string; REQUIREMENT:Requirement; ANALYSIS_ID:string | null; ORIGINAL_REASON:string }
export default function RequirementGroupPage() {
 const {projectId,project}=useProjectContext();
 const [groupAnalysisOpen,setGroupAnalysisOpen]=useState(false);
 const [groups,setGroups]=useState<RequirementGroup[]>([]), [requirements,setRequirements]=useState<Requirement[]>([]);
 const [draft,setDraft]=useState<RequirementGroup|null>(null), [baseline,setBaseline]=useState('');
 const [keyword,setKeyword]=useState(''), [busy,setBusy]=useState(false), [loadedProject,setLoadedProject]=useState('');
 const [message,setMessage]=useState<{type:'success'|'error'|'warn'|'info';text:string}|null>(null);
 const [modal,setModal]=useState<'HUMAN'|'ANALYSIS'|null>(null), [modalSearch,setModalSearch]=useState(''), [reviewBasket,setReviewBasket]=useState(false);
 const [analyses,setAnalyses]=useState<RequirementRecommendation[]>([]), [analysisId,setAnalysisId]=useState(''), [basket,setBasket]=useState<Record<string,Candidate>>({});
 const [comparison,setComparison]=useState<RequirementGroup|null>(null), [impact,setImpact]=useState<GroupMember|null>(null);
 const [evidence,setEvidence]=useState<RequirementRecommendation[]>([]), [evidenceOpen,setEvidenceOpen]=useState(false), [evidenceRequirement,setEvidenceRequirement]=useState('');
 const [searchCondition,setSearchCondition]=useState({keyword:''}), [searchOpen,setSearchOpen]=useState(false);
 const [deletedMembers,setDeletedMembers]=useState<GroupMember[]>([]);
 const [selectedMemberKeys,setSelectedMemberKeys]=useState<Set<string>>(new Set());
 const [leave,setLeave]=useState<(()=>void)|null>(null);
 const activeProject=useRef(projectId), operation=useRef(0), running=useRef(false), allowLeave=useRef(false), modalFocus=useRef<HTMLElement|null>(null);
 const dirty=!!draft && (signature(draft)!==baseline || deletedMembers.length>0);
 const loaded=loadedProject===projectId;
 const readonly=!draft || draft.PROJECT_ID!==projectId || draft.GROUP_STATUS==='CONFIRMED';
 const accept=useCallback((g:RequirementGroup)=>{if(g.PROJECT_ID!==activeProject.current)return;setDraft(g);setDeletedMembers([]);setSelectedMemberKeys(new Set());setBaseline(signature(g));if(g.REQUIREMENT_GROUP_ID)sessionStorage.setItem('basekit:requirement-group-target',JSON.stringify({PROJECT_ID:g.PROJECT_ID,REQUIREMENT_GROUP_ID:g.REQUIREMENT_GROUP_ID}));},[]);
 const refreshLists=async()=>{const [gs,rs]=await Promise.all([api.list(projectId),requirementApi.list(projectId)]);if(activeProject.current===projectId){setGroups(gs);setRequirements(rs);setLoadedProject(projectId);return gs;}return [];};
 useEffect(()=>{
  activeProject.current=projectId; const generation=++operation.current; running.current=false;
  let current=true;
  (projectId ? Promise.all([api.list(projectId),requirementApi.list(projectId)]) : Promise.resolve<[RequirementGroup[],Requirement[]]>([[],[]])).then(async([gs,rs])=>{
   if(!current || generation!==operation.current) return;
   setGroups(gs);setRequirements(rs);setLoadedProject(projectId);setDraft(null);setDeletedMembers([]);setBaseline('');setModal(null);setGroupAnalysisOpen(false);setBusy(false);
   setSelectedMemberKeys(new Set());setKeyword('');setSearchCondition({keyword:''});
   // An explicit jump from Requirement detail takes precedence over default selection.
   const jump=JSON.parse(sessionStorage.getItem('basekit:requirement-group-jump') || 'null') as {PROJECT_ID:string;REQUIREMENT_GROUP_ID:string}|null;
   sessionStorage.removeItem('basekit:requirement-group-jump');
   const initialId=jump?.PROJECT_ID===projectId && gs.some(g=>g.REQUIREMENT_GROUP_ID===jump.REQUIREMENT_GROUP_ID) ? jump.REQUIREMENT_GROUP_ID:gs[0]?.REQUIREMENT_GROUP_ID;
   if(initialId) {const group=await api.get(initialId);if(current && generation===operation.current)accept(group);}

  }).catch((error:Error)=>{if(current){setLoadedProject('');setMessage({type:'error',text:error.message});}});
  return()=>{current=false;};
 },[projectId,accept]);
 const run=async(work:()=>Promise<void>)=>{
  if(running.current) return; running.current=true;setBusy(true); const generation=operation.current;
  try{await work();}catch(error){if(generation===operation.current)setMessage({type:'error',text:error instanceof Error ? error.message:'처리 실패. 초안을 유지했습니다.'});}
  finally{if(generation===operation.current){running.current=false;setBusy(false);}}
 };
 const select=async(id:string)=>{if(!id)return;const generation=operation.current;const g=await api.get(id);if(generation===operation.current)accept(g);};
 const requestLeave=(action:()=>void)=>{
  if(running.current) return false;
  if(dirty){setLeave(()=>action);return false;} action();return true;
 };
 useEffect(()=>{
  const before=(event:BeforeUnloadEvent)=>{if(dirty || running.current){event.preventDefault();event.returnValue='';}};
  const navigation=(event:Event)=>{
   if(allowLeave.current){allowLeave.current=false;return;}
   if(running.current){event.preventDefault();return;}
   if(dirty){event.preventDefault();setLeave(()=> (event as CustomEvent<{resume:()=>void}>).detail.resume);}
  };
  window.addEventListener('beforeunload',before);window.addEventListener('basekit:before-program-change',navigation);
  return()=>{window.removeEventListener('beforeunload',before);window.removeEventListener('basekit:before-program-change',navigation);};
 },[dirty]);
 useEffect(()=>{
  const target=()=>{
   if(!loaded)return;
   const value=JSON.parse(sessionStorage.getItem('basekit:requirement-group-target') || 'null') as {PROJECT_ID:string;REQUIREMENT_GROUP_ID:string}|null;
   sessionStorage.removeItem('basekit:requirement-group-jump');
   if(value?.PROJECT_ID===projectId && (!dirty || window.confirm('초안을 버리고 선택한 그룹으로 이동할까요?'))) void run(()=>select(value.REQUIREMENT_GROUP_ID));
  };
  window.addEventListener('basekit:requirement-group-selected',target);return()=>window.removeEventListener('basekit:requirement-group-selected',target);
 });
 // FormModal supplies Escape/close. Keep focus within the existing modal without changing shared CSS.
 useEffect(()=>{
  if(!modal && !comparison && !impact && !evidenceOpen && !leave) return;
  modalFocus.current=document.activeElement as HTMLElement;
  const area=document.querySelector<HTMLElement>('[role="dialog"]');area?.querySelector<HTMLElement>('button,input,select,textarea')?.focus();
  const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=Array.from(area?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []);if(!items.length)return;const first=items[0],last=items.at(-1)!;if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}};
  window.addEventListener('keydown',trap);return()=>{window.removeEventListener('keydown',trap);(modalFocus.current?.isConnected ? modalFocus.current : document.querySelector<HTMLElement>('.standard-design-header-actions button'))?.focus();};
 },[modal,comparison,impact,evidenceOpen,leave]);
 const save=async()=>{
  if(!draft || !draft.REQUIREMENT_GROUP_NAME.trim())throw new Error('그룹명을 입력하세요.');
  const generation=operation.current;const saved=await api.save(draft.REQUIREMENT_GROUP_ID,groupInput(draft));
  const fetched=await api.get(saved.REQUIREMENT_GROUP_ID);
  if(generation!==operation.current)return;accept(fetched);await refreshLists();setMessage({type:'success',text:'그룹을 저장했습니다.'});
 };
 const finishLeave=(action:()=>void)=>{setLeave(null);setTimeout(()=>{allowLeave.current=true;action();allowLeave.current=false;},0);};
 const openAdd=(source:'HUMAN'|'ANALYSIS')=>void run(async()=>{
  const [rs,as]=await Promise.all([requirementApi.list(projectId),source==='ANALYSIS' ? requirementRecommendationApi.list(projectId):Promise.resolve([])]);
  if(activeProject.current!==projectId)return;setRequirements(rs);setAnalyses(as);setAnalysisId(as[0]?.ANALYSIS_ID ?? '');setBasket({});setModalSearch('');setReviewBasket(false);setModal(source);
 });
 const closeAdd=()=>{if(Object.keys(basket).length && !window.confirm('아직 반영하지 않은 선택을 버릴까요?'))return;setModal(null);setBasket({});};
 const candidates:Candidate[]=modal==='HUMAN' ? requirements.map(r=>({KEY:r.REQUIREMENT_ID,REQUIREMENT:r,ANALYSIS_ID:null,ORIGINAL_REASON:''})) : (analyses.find(a=>a.ANALYSIS_ID===analysisId)?.ITEMS ?? []).flatMap(item=>{
  const r=requirements.find(r=>r.REQUIREMENT_ID===item.REQUIREMENT_ID);return r ? [{KEY:`${analysisId}:${r.REQUIREMENT_ID}`,REQUIREMENT:r,ANALYSIS_ID:analysisId,ORIGINAL_REASON:item.ORIGINAL_REASON}]:[];
 });
 const filtered=candidates.filter(c=>`${c.REQUIREMENT.REQUIREMENT_ID} ${c.REQUIREMENT.REQUIREMENT_NAME}`.toLowerCase().includes(modalSearch.toLowerCase()));
 const additions=Object.values(basket);
 const applyBasket=()=>void run(async()=>{
  const rs=await requirementApi.list(projectId);if(activeProject.current!==projectId || !draft)return;
  for(const item of additions){const current=rs.find(r=>r.REQUIREMENT_ID===item.REQUIREMENT.REQUIREMENT_ID);if(!current || current.REQUIREMENT_REVISION!==item.REQUIREMENT.REQUIREMENT_REVISION)throw new Error('선택 이후 Requirement가 변경되었습니다. 선택을 유지했습니다. 추가 창을 다시 열어 최신 내용을 확인하세요.');}
  const added:GroupMember[]=additions.map(c=>({REQUIREMENT_ID:c.REQUIREMENT.REQUIREMENT_ID,HUMAN_YN:c.ANALYSIS_ID ? 'N':'Y',INCLUSION_REASON:'',REVIEWED_REVISION:c.REQUIREMENT.REQUIREMENT_REVISION,SOURCE_ANALYSIS_IDS:c.ANALYSIS_ID ? [c.ANALYSIS_ID]:[],REQUIREMENT:c.REQUIREMENT}));
  const addedIds=new Set(added.map(member=>member.REQUIREMENT_ID));
  const restored=deletedMembers.filter(member=>addedIds.has(member.REQUIREMENT_ID));
  setDeletedMembers(previous=>previous.filter(member=>!addedIds.has(member.REQUIREMENT_ID)));
  setDraft({...draft,MEMBERS:mergeGroupMembers([...draft.MEMBERS,...restored],added)});setModal(null);setBasket({});setMessage({type:'info',text:'선택을 초안에 반영했습니다. 저장 후 검토·확정하세요.'});
 });
 const current=(m:GroupMember)=>requirements.find(r=>r.REQUIREMENT_ID===m.REQUIREMENT_ID) ?? m.REQUIREMENT;
 const memberColumns:DataTableColumn<GroupMember>[]=[
  {key:'name',header:'요구사항',minWidth:150,flex:1,render:m=><span>{current(m)?.REQUIREMENT_NAME ?? m.REQUIREMENT_ID}{current(m)?.DISCARDED_YN==='Y' ? ' · 폐기됨':''}</span>},
  {key:'source',header:'출처',width:120,render:m=><button type="button" className="action-button" onClick={()=>void run(async()=>{setEvidenceOpen(true);setEvidenceRequirement(m.REQUIREMENT_ID);setEvidence([]);const results=await Promise.all(m.SOURCE_ANALYSIS_IDS.map(id=>requirementRecommendationApi.get(id)));if(activeProject.current===projectId)setEvidence(results);})}>{m.HUMAN_YN==='Y' ? '직접 추가':'Analysis'}{m.SOURCE_ANALYSIS_IDS.length ? ` +근거 ${m.SOURCE_ANALYSIS_IDS.length}`:''}</button>},
  {key:'INCLUSION_REASON',header:'포함 사유',minWidth:140,flex:1,fieldDefinition:{key:'INCLUSION_REASON',label:'포함 사유',dataType:'STRING',controlType:'TEXT',displayType:'TEXT'},render:m=>m.INCLUSION_REASON},
  {key:'review',header:'변경 검토',width:110,render:m=><ActionButton actionCode="SEARCH" display="label" label={m.REVIEWED_REVISION!==current(m)?.REQUIREMENT_REVISION ? '변경 확인':'내용 확인'} disabled={busy || deletedMembers.some(row=>row.REQUIREMENT_ID===m.REQUIREMENT_ID)} onClick={()=>void run(async()=>{const r=await requirementApi.list(projectId);if(activeProject.current===projectId){setRequirements(r);setImpact(m);}})} />},
 ];
 const groupColumns:DataTableColumn<RequirementGroup>[]=[{key:'name',header:'그룹명',minWidth:140,flex:1,render:g=>g.REQUIREMENT_GROUP_NAME},{key:'status',header:'상태',width:100,render:g=>groupStatusLabels[g.GROUP_STATUS]},{key:'count',header:'건수',width:60,render:g=>g.MEMBER_COUNT ?? g.MEMBERS?.length ?? 0}];
 const visible=groups.filter(g=>g.PROJECT_ID===projectId && g.REQUIREMENT_GROUP_NAME.toLowerCase().includes(keyword.toLowerCase()));
 const candidateColumns:DataTableColumn<Candidate>[]=[{key:'selected',header:'선택',width:60,render:c=><input type="checkbox" aria-label={`${c.REQUIREMENT.REQUIREMENT_NAME} 선택`} checked={!!basket[c.KEY]} disabled={busy || (modal==='HUMAN' && !!draft?.MEMBERS.some(m=>m.REQUIREMENT_ID===c.REQUIREMENT.REQUIREMENT_ID))} onChange={e=>setBasket(old=>{const next={...old};if(e.target.checked)next[c.KEY]=c;else delete next[c.KEY];return next;})} />},{key:'name',header:'요구사항',minWidth:150,render:c=>`${c.REQUIREMENT.REQUIREMENT_NAME}${c.REQUIREMENT.DISCARDED_YN==='Y' ? ' · 폐기됨':''}`},{key:'reason',header:'원본 추천 사유',minWidth:160,render:c=>c.ORIGINAL_REASON || '직접 추가'}];
 const refresh=()=>void run(async()=>{await refreshLists();if(draft?.PROJECT_ID===projectId && draft.REQUIREMENT_GROUP_ID){const latest=await api.get(draft.REQUIREMENT_GROUP_ID);if(dirty)setComparison(latest);else accept(latest);}else if(!draft){const gs=await api.list(projectId);if(gs.length)await select(gs[0].REQUIREMENT_GROUP_ID);}});
 const savedMembers=new Map((baseline ? (JSON.parse(baseline) as GroupInput).MEMBERS:[]).map(member=>[member.REQUIREMENT_ID,member]));
 const deletedMemberKeys=new Set(deletedMembers.map(member=>member.REQUIREMENT_ID));
 const displayedMembers=[...(draft?.PROJECT_ID===projectId ? draft.MEMBERS:[]),...deletedMembers].sort((left,right)=>{
  const order=Array.from(savedMembers.keys());
  const leftIndex=order.indexOf(left.REQUIREMENT_ID), rightIndex=order.indexOf(right.REQUIREMENT_ID);
  return (leftIndex<0 ? order.length:leftIndex)-(rightIndex<0 ? order.length:rightIndex);
 });
 const oldImpact=impact?.REVIEWED_SNAPSHOT ? JSON.parse(impact.REVIEWED_SNAPSHOT) as Requirement : null;
 const nextImpact=impact ? current(impact):null;
 return <div className="page standard-design-page standard-design-lifecycle-page multi-grid-page">
  <PageHeader breadcrumbs={['Standard Design','요구사항 그룹 관리']} rightContent={<div className="standard-design-header-actions"><ProjectContextSelector onSelected={()=>{if(busy)return false;return !dirty || window.confirm('현재 그룹 초안을 버리고 프로젝트를 변경할까요?');}} /><ActionButton actionCode="SEARCH" label="최신 조회·초안 비교" disabled={busy || !projectId} onClick={refresh} /><ActionButton actionCode="SEARCH" label="그룹 분석" disabled={busy || dirty || !draft?.REQUIREMENT_GROUP_ID} onClick={()=>setGroupAnalysisOpen(true)} /><div className="standard-design-lifecycle-actions" aria-label="그룹 기능"><ActionButton actionCode="CREATE" label="등록" disabled={busy || !projectId || !loaded} onClick={()=>requestLeave(()=>{const g=empty(projectId);accept(g);setBaseline('');})} />{draft?.PROJECT_ID===projectId ? <><ActionButton actionCode="SAVE" label="저장" disabled={readonly || busy} onClick={()=>void run(save)} /><ActionButton actionCode="APPROVE" label={draft.GROUP_STATUS==='REVIEW_REQUIRED' || (draft.GROUP_STATUS==='CONFIRMED' && !draft.HAS_ANALYSIS_SNAPSHOT) ? '재확정':'확정'} disabled={busy || dirty || !draft.REQUIREMENT_GROUP_ID || !draft.MEMBERS.length || (readonly && !!draft.HAS_ANALYSIS_SNAPSHOT) || !project?.PROJECT_NAME || draft.MEMBERS.some(m=>m.REVIEWED_REVISION!==current(m)?.REQUIREMENT_REVISION)} onClick={()=>void run(async()=>{const saved=await api.confirm(draft.REQUIREMENT_GROUP_ID,draft.VERSION,project?.PROJECT_NAME);accept(await api.get(saved.REQUIREMENT_GROUP_ID));await refreshLists();setMessage({type:'success',text:'현재 검토 기준으로 확정했습니다.'});})} /><ActionButton actionCode="SEARCH" label="그룹 분석" disabled={busy || dirty || !draft.REQUIREMENT_GROUP_ID} onClick={()=>setGroupAnalysisOpen(true)} />{readonly ? <ActionButton actionCode="UPDATE" label="구성 수정" disabled={busy} onClick={()=>void run(async()=>{accept(await api.edit(draft.REQUIREMENT_GROUP_ID,draft.VERSION));await refreshLists();})} />:null}<ActionButton actionCode="DELETE" label="삭제" disabled={busy || readonly || !draft.REQUIREMENT_GROUP_ID} onClick={()=>{if(window.confirm('그룹을 삭제할까요? 원본 Requirement와 Analysis는 보존됩니다.'))void run(async()=>{await api.delete(draft.REQUIREMENT_GROUP_ID,draft.VERSION);if(activeProject.current!==projectId)return;sessionStorage.removeItem('basekit:requirement-group-target');setDraft(null);setDeletedMembers([]);setBaseline('');const remaining=await refreshLists();if(remaining.length)await select(remaining[0].REQUIREMENT_GROUP_ID);});}} /></>:null}</div></div>} />
  {!projectId ? <p>프로젝트 Context를 선택하세요.</p>:<MasterDetailMultiGrid
   detailTopSizing="content"
   detailEmpty={!draft || draft.PROJECT_ID!==projectId ? <p className="sd-project-empty-help">{loaded ? groups.length ? '그룹을 선택하거나 새 그룹을 작성하세요.':'등록된 그룹이 없습니다. 등록 버튼으로 새 그룹을 작성하세요.':'그룹을 조회하고 있습니다.'}</p>:undefined}
   master={<div className="sd-requirement-workspace-shell">{searchOpen ? <div id="group-inline-search" className="project-inline-search"><SearchPanel layout="inline" rows={1} actionDisplay="label" fields={[{key:'keyword',label:'그룹명'}]} value={searchCondition} initialValue={{keyword:''}} onValueChange={setSearchCondition} onSearch={value=>setKeyword(value.keyword)} onReset={value=>{setSearchCondition(value);setKeyword(value.keyword);}} /></div>:null}<div className="project-master-heading project-master-heading--search-toggle"><button type="button" className="secondary-button" aria-expanded={searchOpen} aria-controls="group-inline-search" onClick={()=>setSearchOpen(open=>!open)}>검색</button></div><BaseKitDataGrid programKey="SD_REQUIREMENT_GROUP" roleCode="ADMIN" title="그룹 목록" rows={visible} columns={groupColumns} getRowKey={g=>g.REQUIREMENT_GROUP_ID} currentRowKey={draft?.REQUIREMENT_GROUP_ID} enabledActions={[]} loading={busy} onRowClick={g=>requestLeave(()=>void run(()=>select(g.REQUIREMENT_GROUP_ID)))} emptyMessage={loaded ? groups.length ? '검색 결과가 없습니다.':'등록된 그룹이 없습니다.':'조회 중 또는 조회 실패. 다시 조회하세요.'} toolbarActions={[]} /></div>}
   detailTop={draft?.PROJECT_ID===projectId ? <div><div className="grid-toolbar"><div className="grid-heading-group"><h2>그룹 기본정보 · {groupStatusLabels[draft.GROUP_STATUS]}{dirty ? ' · 미저장':''}</h2></div></div><div className="standard-design-lifecycle-form standard-design-project-form">{keyword && !visible.some(g=>g.REQUIREMENT_GROUP_ID===draft.REQUIREMENT_GROUP_ID) && draft.REQUIREMENT_GROUP_ID ? <p>검색 밖 선택 그룹입니다.</p>:null}<FormField label="그룹명" required errorId="group-name-error" error={!draft.REQUIREMENT_GROUP_NAME.trim() ? '그룹명을 입력하세요.':undefined}><input maxLength={200} aria-label="그룹명" aria-invalid={!draft.REQUIREMENT_GROUP_NAME.trim()} aria-describedby="group-name-error" disabled={readonly || busy} value={draft.REQUIREMENT_GROUP_NAME} onChange={e=>setDraft({...draft,REQUIREMENT_GROUP_NAME:e.target.value})} /></FormField><FormField label="설명"><textarea rows={2} aria-label="그룹 설명" disabled={readonly || busy} value={draft.DESCRIPTION} onChange={e=>setDraft({...draft,DESCRIPTION:e.target.value})} /></FormField></div></div>:<p className="sd-project-empty-help">그룹을 선택하거나 새 그룹을 작성하세요.</p>}
   detailBottom={<BaseKitDataGrid programKey="SD_REQUIREMENT_GROUP" roleCode="ADMIN" title="포함 Requirement" getRowState={member=>deletedMemberKeys.has(member.REQUIREMENT_ID) ? 'DELETED':groupMemberRowState(member,savedMembers.get(member.REQUIREMENT_ID))} columns={memberColumns} selectedRowKeys={selectedMemberKeys} onSelectedRowKeysChange={setSelectedMemberKeys} editing={{keys:['INCLUSION_REASON'],isEditable:()=>!readonly && !busy,onChange:(member,key,value)=>setDraft(previous=>previous ? {...previous,MEMBERS:previous.MEMBERS.map(item=>item.REQUIREMENT_ID===member.REQUIREMENT_ID ? {...item,[key]:value}:item)}:previous)}} rows={displayedMembers} getRowKey={m=>m.REQUIREMENT_ID} enabledActions={[]} emptyMessage="함께 검토할 Requirement를 직접 또는 Analysis 결과에서 추가하세요." toolbarActions={[{actionCode:'DELETE',label:'행 삭제',tone:'danger',disabled:({selectedRows})=>readonly || busy || !selectedRows.some(row=>!deletedMemberKeys.has(row.REQUIREMENT_ID)),onClick:({selectedRows})=>{const newlyDeleted=selectedRows.filter(row=>!deletedMemberKeys.has(row.REQUIREMENT_ID));const removed=new Set(newlyDeleted.map(row=>row.REQUIREMENT_ID));setDeletedMembers(previous=>[...previous,...newlyDeleted]);setDraft(previous=>previous ? {...previous,MEMBERS:previous.MEMBERS.filter(member=>!removed.has(member.REQUIREMENT_ID))}:previous);setSelectedMemberKeys(new Set());}},{actionCode:'CREATE',label:'요구사항에서 추가',disabled:readonly || busy,onClick:()=>openAdd('HUMAN')},{actionCode:'CREATE',label:'Analysis에서 추가',disabled:readonly || busy,onClick:()=>openAdd('ANALYSIS')}]} />}
   message={message ? <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={()=>setMessage(null)} />:null} />}
  {groupAnalysisOpen && draft?.PROJECT_ID===projectId ? <RequirementGroupAnalysis key={draft.REQUIREMENT_GROUP_ID} group={draft} onClose={()=>setGroupAnalysisOpen(false)} />:null}
  <FormModal open={!!modal} title={reviewBasket ? '누적 선택 최종 확인':modal==='HUMAN' ? '요구사항 직접 추가':'Analysis 추천 결과에서 추가'} submitting={busy} onClose={closeAdd} submitLabel={reviewBasket ? '초안에 추가':`누적 선택 확인 (${additions.length})`} submitDisabled={!additions.length} onSubmit={()=>{if(reviewBasket)applyBasket();else setReviewBasket(true);}}>
   {reviewBasket ? <><p>{new Set(additions.map(c=>c.REQUIREMENT.REQUIREMENT_ID)).size}개 Requirement / {additions.length}개 선택 근거. 같은 Requirement는 한 건으로 합치고 기존 근거를 유지합니다.</p><DataTable columns={candidateColumns.slice(1)} rows={additions} getRowKey={c=>c.KEY} /><button type="button" className="secondary-button" onClick={()=>setReviewBasket(false)}>선택으로 돌아가기</button></>:<>{modal==='ANALYSIS' ? <label>독립 Analysis 실행<select aria-label="Analysis 실행" value={analysisId} onChange={e=>setAnalysisId(e.target.value)}><option value="">실행 선택</option>{analyses.map(a=><option key={a.ANALYSIS_ID} value={a.ANALYSIS_ID}>{a.ANALYSIS_ID} · {a.EXECUTED_AT} · {a.ANALYSIS_BASIS}</option>)}</select></label>:null}<div className="sd-requirement-search"><input aria-label="후보 검색" placeholder="요구사항 검색" value={modalSearch} onChange={e=>setModalSearch(e.target.value)} /></div><p>누적 {additions.length}건 선택. 검색/실행을 바꿔도 선택은 유지됩니다.</p><DataTable columns={candidateColumns} rows={filtered} getRowKey={c=>c.KEY} emptyMessage={modal==='ANALYSIS' && !analyses.length ? '저장된 독립 추천 실행이 없습니다.':'선택할 항목이 없습니다.'} /></>}
   {message?.type==='error' ? <BaseKitMessage type="error" message={message.text} />:null}
  </FormModal>
  <FormModal open={!!impact} title="Requirement 변경 영향 검토" submitting={busy} onClose={()=>setImpact(null)} submitLabel="현재 내용 검토 완료" submitDisabled={readonly} onSubmit={()=>{if(draft && impact && nextImpact){setDraft({...draft,MEMBERS:draft.MEMBERS.map(m=>m.REQUIREMENT_ID===impact.REQUIREMENT_ID ? {...m,REVIEWED_REVISION:nextImpact.REQUIREMENT_REVISION,REQUIREMENT:nextImpact}:m)});setImpact(null);}}}><p>이전 검토 기준: {oldImpact?.REQUIREMENT_NAME ?? '새로 추가'} / {oldImpact?.REQUIREMENT_REVISION ?? impact?.REVIEWED_REVISION}</p><p>유형: {oldImpact?.REQUIREMENT_TYPE_CODE} / 상태: {oldImpact?.STATUS} {oldImpact?.DISCARDED_YN==='Y' ? '· 폐기됨':''}</p><p>관련 메뉴: {oldImpact?.PROJECT_MENU_IDS?.join(', ') || '없음'}</p><p>첨부: {oldImpact?.ATTACHMENTS?.map(a=>a.ORIGINAL_FILE_NAME).join(', ') || '없음'}</p><p>{oldImpact?.DESCRIPTION}</p><p>{oldImpact?.PROCESS_DESCRIPTION}</p><p>{oldImpact?.DESIGN_OPINION}</p><hr /><p>현재: {nextImpact?.REQUIREMENT_NAME} / {nextImpact?.REQUIREMENT_REVISION} {nextImpact?.DISCARDED_YN==='Y' ? '· 폐기됨':''}</p><p>유형: {nextImpact?.REQUIREMENT_TYPE_CODE} / 상태: {nextImpact?.STATUS} {nextImpact?.DISCARDED_YN==='Y' ? '· 폐기됨':''}</p><p>관련 메뉴: {nextImpact?.PROJECT_MENU_IDS?.join(', ') || '없음'}</p><p>첨부: {nextImpact?.ATTACHMENTS?.map(a=>a.ORIGINAL_FILE_NAME).join(', ') || '없음'}</p><p>{nextImpact?.DESCRIPTION}</p><p>{nextImpact?.PROCESS_DESCRIPTION}</p><p>{nextImpact?.DESIGN_OPINION}</p><p>영향이 없으면 현재 내용을 검토 완료로 표시하고 저장 후 재확정하세요. 구성에서 제거하는 판단도 사용자가 합니다.</p></FormModal>
  <FormModal open={evidenceOpen} title="Analysis 원본 근거" submitting={busy} onClose={()=>setEvidenceOpen(false)}>{busy ? <p>조회 중</p>:evidence.length ? evidence.map(a=><section key={a.ANALYSIS_ID}><h3>{a.ANALYSIS_ID}</h3><p>{a.ANALYSIS_BASIS} · {a.EXECUTED_AT}</p>{a.ITEMS.filter(i=>i.REQUIREMENT_ID===evidenceRequirement).map(i=><p key={i.REQUIREMENT_ID}>{i.REQUIREMENT_ID}: {i.ORIGINAL_REASON}</p>)}</section>):<p>직접 추가이거나 근거 조회에 실패했습니다. 그룹 구성은 유지됩니다.</p>}</FormModal>
  <FormModal open={!!comparison} title="최신 저장 결과와 초안 비교" onClose={()=>setComparison(null)} submitLabel="최신 저장 결과 사용" onSubmit={()=>{if(comparison && window.confirm('현재 초안을 버리고 최신 결과를 사용할까요?')){accept(comparison);setComparison(null);}}}><p>현재 초안 v{draft?.VERSION} / 서버 v{comparison?.VERSION}</p><section><h3>현재 초안</h3><p>{draft?.REQUIREMENT_GROUP_NAME}</p><p>{draft?.DESCRIPTION}</p><ul>{draft?.MEMBERS.map(m=><li key={m.REQUIREMENT_ID}>{current(m)?.REQUIREMENT_NAME ?? m.REQUIREMENT_ID}: {m.INCLUSION_REASON || '사유 없음'} · 근거 {m.SOURCE_ANALYSIS_IDS.length}개</li>)}</ul></section><section><h3>최신 저장 결과</h3><p>{comparison?.REQUIREMENT_GROUP_NAME}</p><p>{comparison?.DESCRIPTION}</p><ul>{comparison?.MEMBERS.map(m=><li key={m.REQUIREMENT_ID}>{m.REQUIREMENT?.REQUIREMENT_NAME ?? m.REQUIREMENT_ID}: {m.INCLUSION_REASON || '사유 없음'} · 근거 {m.SOURCE_ANALYSIS_IDS.length}개</li>)}</ul></section></FormModal>
  <FormModal open={!!leave} title="저장하지 않은 그룹 변경" footerActions={<ActionButton actionCode="REVERT_CHANGES" label="변경 버리고 이동" disabled={busy} onClick={()=>{if(leave)finishLeave(leave);}} />} submitting={busy} onClose={()=>setLeave(null)} submitLabel="저장 후 이동" onSubmit={()=>void run(async()=>{const action=leave;if(action){await save();finishLeave(action);}})}><p>계속 편집하려면 닫으세요. 저장에 실패하면 초안을 보존하며 이동하지 않습니다.</p></FormModal>
 </div>;
}
