import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { designLifecycleRepository } from '../design-lifecycle/designLifecycle.repository';
import MenuBuilderPage from './MenuBuilderPage';
import { loadAnalysisDraft } from './loadAnalysisDraft';
import type { MenuNode } from './menuBuilder';
export default function AnalysisMenuBuilderPage() {
 const [searchParams] = useSearchParams();
 const { pathname } = useLocation();
 const navigate = useNavigate();
 const [projects,setProjects] = useState<{PROJECT_ID:string;PROJECT_NAME:string}[]>([]);
 const [project,setProject] = useState(() => searchParams.get('project') ?? designLifecycleRepository.getSelectedProjectId());
 useEffect(() => {
  if ((searchParams.get('project') ?? '') === project) return;
  const next = new URLSearchParams(searchParams);
  if (project) next.set('project', project); else next.delete('project');
  // MDI can mount this component before its route navigation commits.
  // Always write the query against the builder route, never the previous screen.
  navigate({ pathname: pathname.startsWith('/window/') ? pathname : '/standard-design/prototypes/menu-builder', search: next.toString() }, { replace: true });
 }, [project, searchParams, navigate, pathname]);
 const [error,setError] = useState('');
 const [busy,setBusy] = useState(false);
 const [pending,setPending] = useState<(() => void) | null>(null);
 function protect(action: () => void) { if (view) setPending(() => action); else action(); }
 const [warnings,setWarnings] = useState<string[]>([]);
 const [view,setView] = useState<{project:string;nodes:MenuNode[];restore:boolean;revision:number;sample?:boolean} | null>(null);
 useEffect(() => { let active=true; fetch('/api/standard-design/projects').then(async r => {if(!r.ok) throw new Error('프로젝트 목록 조회 실패'); return await r.json() as {DATA:{PROJECT_ID:string;PROJECT_NAME:string}[]};}).then(r => {if(active) setProjects(r.DATA);}).catch(e => {if(active) setError(String(e));}); return () => {active=false;}; },[]);
 async function generate() {
  setBusy(true); setError('');
  try { const result = await loadAnalysisDraft(project); setWarnings(result.warnings); if(result.nodes.length) setView({project,nodes:result.nodes,restore:false,revision:Date.now()}); else { setView(null); setError('사용 가능한 메뉴 후보가 없습니다. 그룹 분석 결과와 아래 안내를 확인하세요.'); } }
  catch(e) {setError(e instanceof Error ? e.message : '초안 조회 실패');}
  finally {setBusy(false);}
 }
 return <><section className="mb-workspace mb-source" aria-label="분석 결과 연결"><h1>메뉴 설계 · AI 메뉴 구성 초안 V1</h1><p>요구사항 관리 → 요구사항 그룹 관리·그룹 분석 → 메뉴 설계·DnD 편집 → 화면 설계</p><p>메뉴 설계는 AI 분석 초안 구성과 DnD 편집을 위한 UI 프로토타입입니다. 프로젝트 메뉴관리는 확정된 메뉴의 유지관리 화면입니다. 이 초안을 확정하거나 프로젝트 메뉴에 등록하는 기능은 아직 제공하지 않습니다.</p><p>저장된 그룹 설계 후보를 그룹별 폴더로 변환합니다. 새 AI 생성 실행과 메뉴 DB 등록은 연결하지 않았습니다. 저장 초안은 저장 당시 분석 기준이므로 최신 결과는 다시 만들기로 확인하세요.</p>
 <label>프로젝트 <select value={project} disabled={busy} onChange={e => {const value=e.target.value;protect(() => {setProject(value);setView(null);setWarnings([]);setError('');});}}><option value="">프로젝트 선택</option>{projects.map(p => <option key={p.PROJECT_ID} value={p.PROJECT_ID}>{p.PROJECT_NAME || p.PROJECT_ID} ({p.PROJECT_ID})</option>)}</select></label>{' '}
 <button disabled={!project || busy} onClick={() => protect(() => void generate())}>{busy ? '분석 결과 읽는 중…' : '분석 결과에서 메뉴 초안 만들기'}</button>{' '}
 <button disabled={!project || busy} onClick={() => protect(() => {try {const raw=localStorage.getItem(`sd-menu-analysis-draft-v1:${encodeURIComponent(project)}`);if(!raw) throw new Error('이 프로젝트에 저장한 브라우저 초안이 없습니다.');setView({project,nodes:[],restore:true,revision:Date.now()});setError('');} catch(e){setError(String(e));}})}>저장 초안 열기</button>{' '}
 <button disabled={busy} onClick={() => protect(() => {setView({project:'sample',nodes:[],restore:true,revision:Date.now(),sample:true});setWarnings([]);setError('');})}>샘플 열기</button>
 {pending && <div className="mb-confirm" role="alertdialog" aria-label="현재 초안 보호"><p>현재 초안을 닫습니다. 브라우저에 저장하지 않은 편집은 사라집니다.</p><button onClick={() => {const action=pending;setPending(null);action();}}>계속 진행</button><button onClick={() => setPending(null)}>편집 유지</button></div>}
 {error && <p role="alert">{error}</p>}{warnings.length > 0 && <details open><summary>분석 검토 안내 ({warnings.length})</summary>{warnings.map((w,i) => <p key={i}>{w}</p>)}</details>}
 {!view && !busy && <p>프로젝트를 선택해 초안을 만들거나 저장한 초안을 여세요. 편집 내용은 프로젝트별로 이 브라우저에만 저장됩니다.</p>}</section>
 <div inert={busy}>{view && <MenuBuilderPage key={`${view.project}:${view.revision}`} {...(view.sample ? {} : {sourceNodes:view.nodes,storageKey:`sd-menu-analysis-draft-v1:${encodeURIComponent(view.project)}`,restore:view.restore,sample:false})} />}</div></>;
}
