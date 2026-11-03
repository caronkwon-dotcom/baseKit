import { useCallback, useEffect, useState } from 'react';
import { BaseKitMessage, DataTable, type DataTableColumn } from '../../../../components/common';
import { designProgramApi, type DesignProgram, type ProgramCandidate } from '../../programs/designProgramApi';
import type { GroupAnalysis } from '../../requirementgroup/groupAnalysis.types';
import type { RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import RequirementGroupAnalysis from './RequirementGroupAnalysis';
import './groupAnalysis.css';

const snapshotName = (raw: string | null) => { try { return (JSON.parse(raw ?? '') as { name?: string }).name ?? ''; } catch { return ''; } };

/** AI program candidates of one analysis run; registration goes through the existing program register adoption. */
function ProgramCandidates({ group, run, onAdopted }: { group: RequirementGroup; run: GroupAnalysis; onAdopted: () => void }) {
 const project = group.PROJECT_ID;
 const [state, setState] = useState<{ key: string; rows: ProgramCandidate[] | null; error: string }>({ key: '', rows: null, error: '' });
 const [selected, setSelected] = useState(new Set<number>());
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [version, setVersion] = useState(0);
 const key = `${run.ANALYSIS_ID}:${version}`;
 useEffect(() => {
  let active = true;
  designProgramApi.candidates(project, group.REQUIREMENT_GROUP_ID, run.ANALYSIS_ID)
   .then(rows => { if (active) setState({ key, rows, error: '' }); })
   .catch(e => { if (active) setState({ key, rows: null, error: e instanceof Error ? e.message : '후보를 조회하지 못했습니다.' }); });
  return () => { active = false; };
 }, [project, group.REQUIREMENT_GROUP_ID, run.ANALYSIS_ID, key]);
 const loading = state.key !== key;
 const rows = loading ? null : state.rows;
 const unclassified = run.RESPONSE?.unclassified ?? [];
 const total = group.MEMBERS.length;
 const nameOf = (id: string) => group.MEMBERS.find(member => member.REQUIREMENT_ID === id)?.REQUIREMENT?.REQUIREMENT_NAME ?? id;
 const adopt = async () => {
  setBusy(true); setError('');
  try { await designProgramApi.adopt(project, group.REQUIREMENT_GROUP_ID, run.ANALYSIS_ID, [...selected]); setSelected(new Set()); onAdopted(); }
  catch (e) { setError(e instanceof Error ? e.message : '등록하지 못했습니다.'); }
  finally { setBusy(false); setVersion(value => value + 1); }
 };
 const toggle = (index: number, checked: boolean) => setSelected(previous => { const next = new Set(previous); if (checked) next.add(index); else next.delete(index); return next; });
 return <section className="sd-gp" aria-label="프로그램 후보">
  <h4>AI 프로그램 후보{rows ? ` ${rows.length}건` : ''}</h4>
  {run.GROUP_VERSION !== group.VERSION ? <BaseKitMessage type="warn" message={`이 분석은 그룹 v${run.GROUP_VERSION} 기준입니다(현재 v${group.VERSION}). 현재 구성과 다를 수 있으니 재분석을 검토하세요.`} /> : null}
  <p className="sd-analysis-help">요구사항 {total}건 중 {Math.max(0, total - unclassified.length)}건이 프로그램에 연결되었습니다. AI 제안이며 등록 전에는 대장에 반영되지 않습니다.</p>
  {state.error && !loading ? <BaseKitMessage type="error" message={state.error} /> : null}
  {error ? <BaseKitMessage type="error" message={error} /> : null}
  {loading ? <p role="status" className="sd-analysis-help">후보 조회 중…</p> : null}
  {rows?.length === 0 ? <p className="sd-analysis-help">프로그램 후보가 없습니다.</p> : null}
  <div className="sd-gp-list">
   {rows?.map(candidate => <article key={candidate.CANDIDATE_INDEX} className="sd-gp-item">
    <label className="sd-gp-head">
     <input type="checkbox" aria-label={`${candidate.PROGRAM_NAME} 선택`} disabled={busy || !!candidate.PROGRAM_ID || !!candidate.ERROR} checked={selected.has(candidate.CANDIDATE_INDEX)} onChange={event => toggle(candidate.CANDIDATE_INDEX, event.target.checked)} />
     <strong>{candidate.PROGRAM_NAME}</strong>
     {candidate.PROGRAM_ID ? <span className="sd-gr-badge">등록됨</span> : null}
    </label>
    <p className="sd-gp-text">{candidate.DESCRIPTION || '등록된 내용 없음'}</p>
    {candidate.ERROR ? <BaseKitMessage type="warn" message={candidate.ERROR} /> : null}
    <ul className="sd-gp-evidence" aria-label="담당 요구사항">
     {candidate.EVIDENCE.map(evidence => <li key={evidence.requirementId}><span>{evidence.name || nameOf(evidence.requirementId)}</span><span className="sd-gr-id">{evidence.requirementId}</span></li>)}
    </ul>
   </article>)}
  </div>
  {unclassified.length ? <div className="sd-gp-unclassified">
   <h5>미분류 요구사항 {unclassified.length}건</h5>
   <ul>{unclassified.map(item => <li key={item.requirementId}><strong>{nameOf(item.requirementId)}</strong> <span className="sd-gr-id">{item.requirementId}</span><br />{item.reason}</li>)}</ul>
  </div> : null}
  <div className="sd-gp-actions"><button type="button" className="primary-button" disabled={busy || loading || !selected.size} onClick={() => void adopt()}>선택 후보 등록 ({selected.size})</button></div>
 </section>;
}

/** STEP 03: AI program list from the confirmed group, shown with its analysis content and the programs already registered for the group. */
export default function GroupProgramPanel({ group, projectName, blocked, onRunsChange, initialAnalysisId, onClose }: {
 group: RequirementGroup; projectName?: string; blocked: boolean; onRunsChange: (runs: GroupAnalysis[]) => void; initialAnalysisId?: string; onClose: () => void;
}) {
 const project = group.PROJECT_ID;
 const [registered, setRegistered] = useState<{ key: string; rows: DesignProgram[] | null; error: string }>({ key: '', rows: null, error: '' });
 const [reload, setReload] = useState(0);
 const [legacyOpen, setLegacyOpen] = useState(!!initialAnalysisId);
 const key = `${group.REQUIREMENT_GROUP_ID}:${reload}`;
 useEffect(() => {
  let active = true;
  designProgramApi.list(project)
   .then(rows => { if (active) setRegistered({ key, rows: rows.filter(row => row.SOURCE_GROUP_ID === group.REQUIREMENT_GROUP_ID), error: '' }); })
   .catch(e => { if (active) setRegistered({ key, rows: null, error: e instanceof Error ? e.message : '프로그램 목록을 조회하지 못했습니다.' }); });
  return () => { active = false; };
 }, [project, group.REQUIREMENT_GROUP_ID, key]);
 const refresh = useCallback(() => setReload(value => value + 1), []);
 const current = registered.key === key;
 const columns: DataTableColumn<DesignProgram>[] = [
  { key: 'PROGRAM_NAME', header: '프로그램명', minWidth: 180, flex: 2, render: program => program.PROGRAM_NAME },
  { key: 'DESCRIPTION', header: '설명', minWidth: 220, flex: 3, render: program => program.DESCRIPTION || '등록된 내용 없음' },
  { key: 'REQUIREMENTS', header: '담당 요구사항', minWidth: 220, flex: 3, render: program => program.EVIDENCE.length ? program.EVIDENCE.map(item => snapshotName(item.SNAPSHOT_JSON) || item.REQUIREMENT_ID).join(', ') : '-' },
  { key: 'SOURCE', header: '출처', minWidth: 160, render: program => program.SOURCE_ANALYSIS_ID ? `AI 분석 ${program.SOURCE_ANALYSIS_ID}` : '수동' },
 ];
 return <div className="sd-group-analysis">
  <p className="sd-analysis-help">STEP 02의 그룹 구성과 요구사항 내용(원문·업무 프로세스·설계 의견)을 기반으로 AI가 프로그램 목록을 제안합니다. 후보를 검토하고 프로그램 대장에 등록하세요. 등록한 프로그램은 이후 화면 설계의 대상이 됩니다.</p>
  <RequirementGroupAnalysis key={`${group.REQUIREMENT_GROUP_ID}:programs`} fixedType="GROUP_PROGRAMS" onRunsChange={onRunsChange} group={group} embedded blocked={blocked} projectName={projectName} onClose={onClose}
   renderResult={run => <ProgramCandidates key={run.ANALYSIS_ID} group={group} run={run} onAdopted={refresh} />} />
  <section aria-label="이 그룹의 프로그램 목록">
   <h4>이 그룹의 프로그램 목록{current && registered.rows ? ` ${registered.rows.length}건` : ''}</h4>
   {registered.error && current ? <BaseKitMessage type="error" message={registered.error} /> : null}
   <DataTable columns={columns} rows={current ? registered.rows ?? [] : []} getRowKey={program => program.PROGRAM_ID} emptyMessage="이 그룹에서 등록한 프로그램이 없습니다." />
  </section>
  <details className="sd-analysis-technical" open={legacyOpen} onToggle={event => setLegacyOpen(event.currentTarget.open)}>
   <summary>설계 개요 분석 · 이전 방식(참고용)</summary>
   {legacyOpen ? <RequirementGroupAnalysis key={`${group.REQUIREMENT_GROUP_ID}:design`} fixedType="GROUP_DESIGN" onRunsChange={onRunsChange} group={group} initialAnalysisId={initialAnalysisId} embedded blocked={blocked} projectName={projectName} onClose={onClose} /> : null}
  </details>
 </div>;
}
