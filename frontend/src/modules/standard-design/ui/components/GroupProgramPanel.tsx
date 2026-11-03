import { useCallback, useEffect, useState } from 'react';
import { BaseKitMessage, DataTable, type DataTableColumn } from '../../../../components/common';
import { designProgramApi, type AdoptionCheck, type DesignProgram, type ProgramCandidate } from '../../programs/designProgramApi';
import { candidateState, candidateStateLabel, filterCandidates, ledgerInfoOf, stateCounts, type CandidateFilter, type CandidateState } from '../../programs/programDecision';
import { programKindLabel } from '../../programs/programKind';
import type { GroupAnalysis } from '../../requirementgroup/groupAnalysis.types';
import type { RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import RequirementGroupAnalysis from './RequirementGroupAnalysis';
import './groupAnalysis.css';

const snapshotName = (raw: string | null) => { try { return (JSON.parse(raw ?? '') as { name?: string }).name ?? ''; } catch { return ''; } };
const guide = ['분석 실행', '후보 검토', '대장 등록'];
const filters: { value: CandidateFilter; label: string }[] = [
 { value: 'ALL', label: '전체' }, { value: 'NEW', label: '신규' }, { value: 'REUSE', label: '재사용' }, { value: 'CHANGE', label: '변경' }, { value: 'REVIEW_REQUIRED', label: '검토 필요' },
];

/** AI program candidates of one analysis run; registration goes through the existing program register adoption. */
function ProgramCandidates({ group, run, onAdopted }: { group: RequirementGroup; run: GroupAnalysis; onAdopted: () => void }) {
 const project = group.PROJECT_ID;
 const [state, setState] = useState<{ key: string; rows: ProgramCandidate[] | null; error: string }>({ key: '', rows: null, error: '' });
 const [selected, setSelected] = useState(new Set<number>());
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [review, setReview] = useState<AdoptionCheck | null>(null);
 const [filter, setFilter] = useState<CandidateFilter>('ALL');
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
 const ledgerInfo = ledgerInfoOf(run.REQUEST_JSON);
 const compare = rows?.[0]?.LEDGER_COMPARE ?? (run.PROMPT_VERSION?.startsWith('group-programs-v0.3') ? 'DONE' : 'NOT_PERFORMED');
 const counts = stateCounts(rows ?? []);
 const shown = filterCandidates(rows ?? [], filter);
 const nameOf = (id: string) => group.MEMBERS.find(member => member.REQUIREMENT_ID === id)?.REQUIREMENT?.REQUIREMENT_NAME ?? id;
 const register = async (acknowledge: boolean) => {
  setBusy(true); setError('');
  try {
   const indexes = [...selected];
   if (!acknowledge) {
    // The register is read again right before registration: names can clash and programs may have been added since the analysis.
    const check = await designProgramApi.adoptionCheck(project, group.REQUIREMENT_GROUP_ID, run.ANALYSIS_ID, indexes);
    if (check.NAME_CONFLICTS.length) { setReview(check); return; }
    if (check.ADDED_AFTER_ANALYSIS.length || check.SIMILAR_NAMES.length) { setReview(check); return; }
   }
   await designProgramApi.adopt(project, group.REQUIREMENT_GROUP_ID, run.ANALYSIS_ID, indexes, acknowledge);
   setSelected(new Set()); setReview(null); onAdopted(); setVersion(value => value + 1);
  } catch (e) { setError(e instanceof Error ? e.message : '등록하지 못했습니다.'); setVersion(value => value + 1); }
  finally { setBusy(false); }
 };
 const toggle = (index: number, checked: boolean) => { setReview(null); setSelected(previous => { const next = new Set(previous); if (checked) next.add(index); else next.delete(index); return next; }); };
 const registrable = rows?.filter(candidate => candidate.REGISTRABLE).map(candidate => candidate.CANDIDATE_INDEX) ?? [];
 const stat = (value: number | string, label: string, warn = false) => <div className={`sd-gp-stat${warn ? ' sd-gp-stat--warn' : ''}`}><strong>{value}</strong><span>{label}</span></div>;
 return <section className="sd-gp" aria-label="프로그램 후보">
  <div className="sd-gp-stats" role="group" aria-label="분석 결과 요약">
   {stat(rows ? rows.length : '-', '프로그램 후보')}
   {compare === 'NOT_PERFORMED' ? stat(counts.NOT_COMPARED, '대장 비교 미수행') : <>{stat(counts.NEW, '신규')}{stat(counts.REUSE, '재사용')}{stat(counts.CHANGE, '변경')}{stat(counts.REVIEW_REQUIRED, '검토 필요', counts.REVIEW_REQUIRED > 0)}</>}
   {stat(`${Math.max(0, total - unclassified.length)} / ${total}`, '프로그램에 연결된 요구사항')}
   {stat(unclassified.length, '미분류 요구사항', unclassified.length > 0)}
  </div>
  {run.GROUP_VERSION !== group.VERSION ? <BaseKitMessage type="warn" message={`이 분석은 그룹 v${run.GROUP_VERSION} 기준입니다(현재 v${group.VERSION}). 현재 구성과 다를 수 있으니 재분석을 검토하세요.`} /> : null}
  {compare === 'NOT_PERFORMED' ? <BaseKitMessage type="info" message="기존 프로그램 대장과 비교하지 않은 결과입니다. 등록 전에 대장에 같은 프로그램이 없는지 확인하세요." /> : null}
  {compare === 'PARTIAL' ? <BaseKitMessage type="warn" message={`기존 프로그램 ${ledgerInfo?.total ?? '-'}건 중 ${ledgerInfo?.included ?? '-'}건만 비교한 분석입니다. 재사용·변경·신규 판단에 한계가 있어 신규 등록을 차단했습니다. 재분석이 필요합니다.`} /> : null}
  {compare === 'DONE' && ledgerInfo ? <p className="sd-analysis-help">{ledgerInfo.total ? `기존 프로그램 ${ledgerInfo.total}건과 비교했습니다(${ledgerInfo.detail}).` : '기존 프로그램이 없어 모든 후보가 신규 기준입니다.'}</p> : null}
  {state.error && !loading ? <BaseKitMessage type="error" message={state.error} /> : null}
  {error ? <BaseKitMessage type="error" message={error} /> : null}
  <div className="sd-gp-bar">
   <h4>AI 프로그램 후보</h4>
   <div className="sd-gp-filters" role="group" aria-label="후보 필터">
    {filters.map(item => <button key={item.value} type="button" className="secondary-button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
   </div>
   <div className="sd-gp-bar-actions">
    <button type="button" className="secondary-button" disabled={busy || loading || !registrable.length} onClick={() => { setReview(null); setSelected(new Set(registrable)); }}>등록 가능 전체 선택</button>
    <button type="button" className="secondary-button" disabled={busy || !selected.size} onClick={() => { setReview(null); setSelected(new Set()); }}>선택 해제</button>
   </div>
  </div>
  {loading ? <p role="status" className="sd-analysis-help">후보 조회 중…</p> : null}
  {rows?.length === 0 ? <p className="sd-analysis-help">프로그램 후보가 없습니다.</p> : null}
  <div className="sd-gp-list">
   {shown.map(candidate => {
    const candidateStatus: CandidateState = candidateState(candidate);
    const position = (rows ?? []).indexOf(candidate) + 1;
    return <article key={candidate.CANDIDATE_INDEX} className={`sd-gp-item${candidate.PROGRAM_ID ? ' sd-gp-item--done' : ''}${candidate.REGISTRABLE ? '' : ' sd-gp-item--blocked'}`}>
     <label className="sd-gp-head">
      <input type="checkbox" aria-label={`${candidate.PROGRAM_NAME} 선택`} disabled={busy || !candidate.REGISTRABLE} checked={selected.has(candidate.CANDIDATE_INDEX)} onChange={event => toggle(candidate.CANDIDATE_INDEX, event.target.checked)} />
      <span className="sd-gr-step-no" aria-hidden="true">{position}</span>
      <strong>{candidate.PROGRAM_NAME}</strong>
      {programKindLabel(candidate.PROGRAM_KIND) ? <span className="sd-gr-badge">{programKindLabel(candidate.PROGRAM_KIND)}</span> : null}
      <span className={`sd-gr-badge sd-gp-state sd-gp-state--${candidateStatus.toLowerCase()}`}>{candidateStateLabel(candidateStatus)}</span>
      {candidate.PROGRAM_ID ? <span className="sd-gr-badge sd-gp-registered">등록됨</span> : null}
     </label>
     <div className="sd-gp-body">
      {candidate.ISSUES?.length ? <div className="sd-gp-issues">
       {candidate.ISSUES.map(issue => <BaseKitMessage key={issue.CODE} type="error" message={issue.MESSAGE} />)}
       <p className="sd-analysis-help">등록할 수 없는 후보입니다. 재분석하여 새 결과를 받으세요(자동으로 재시도하지 않습니다).</p>
      </div> : null}
      <div className="sd-gr-field"><dl><dt>프로그램 설명</dt><dd>{candidate.DESCRIPTION ? <p className="sd-gp-text">{candidate.DESCRIPTION}</p> : <span className="sd-gr-empty">등록된 내용 없음</span>}</dd></dl></div>
      {candidate.EXISTING ? <div className="sd-gp-existing">
       <h5>기존 프로그램</h5>
       <p><strong>{candidate.EXISTING.PROGRAM_NAME}</strong>{programKindLabel(candidate.EXISTING.PROGRAM_KIND) ? ` · ${programKindLabel(candidate.EXISTING.PROGRAM_KIND)}` : ''} <span className="sd-gr-id">{candidate.EXISTING.PROGRAM_ID}</span></p>
       {candidate.EXISTING.SHARED_REQUIREMENT_IDS.length ? <p className="sd-analysis-help">이미 같은 요구사항 {candidate.EXISTING.SHARED_REQUIREMENT_IDS.length}건이 연결되어 있습니다.</p> : null}
      </div> : null}
      {candidate.DECISION_REASON ? <div className="sd-gr-field"><dl><dt>판단 근거</dt><dd><p className="sd-gp-text">{candidate.DECISION_REASON}</p></dd></dl></div> : null}
      {candidate.CHANGE_SUMMARY ? <div className="sd-gr-field"><dl><dt>변경 내용</dt><dd><p className="sd-gp-text">{candidate.CHANGE_SUMMARY}</p></dd></dl></div> : null}
      {candidate.ERROR ? <BaseKitMessage type="warn" message={candidate.ERROR} /> : null}
      {candidate.WARNINGS?.map(warning => <BaseKitMessage key={warning.CODE} type="warn" message={warning.MESSAGE} />)}
      {!candidate.ISSUES?.length && candidate.BLOCK_REASONS?.length ? <p className="sd-gp-block">{candidate.BLOCK_REASONS.join(' ')}</p> : null}
      <div className="sd-gr-field"><dl><dt>담당 요구사항 {candidate.EVIDENCE.length}건</dt><dd>
       <ul className="sd-gp-evidence" aria-label="담당 요구사항">
        {candidate.EVIDENCE.map(evidence => <li key={evidence.requirementId}><span>{evidence.name || nameOf(evidence.requirementId)}</span><span className="sd-gr-id">{evidence.requirementId}</span></li>)}
       </ul></dd></dl></div>
     </div>
    </article>;
   })}
  </div>
  {unclassified.length ? <div className="sd-gp-unclassified">
   <h5>미분류 요구사항 {unclassified.length}건 <span className="sd-gr-badge">직접 배치 필요</span></h5>
   <ul>{unclassified.map(item => <li key={item.requirementId}><strong>{nameOf(item.requirementId)}</strong> <span className="sd-gr-id">{item.requirementId}</span>{item.source === 'SERVER' ? <span className="sd-gr-badge">AI 응답 누락</span> : null}<span className="sd-gp-reason">{item.reason}</span></li>)}</ul>
  </div> : null}
  {review ? <div className="sd-gp-review" role="alertdialog" aria-label="등록 전 대장 확인">
   <h5>등록 전에 대장을 다시 확인했습니다</h5>
   {review.NAME_CONFLICTS.length ? <><BaseKitMessage type="error" message="같은 이름의 프로그램이 이미 대장에 있어 등록할 수 없습니다." />
    <ul>{review.NAME_CONFLICTS.map(item => <li key={`${item.CANDIDATE_INDEX}:${item.PROGRAM_ID}`}>{item.CANDIDATE_NAME} ↔ 대장의 <strong>{item.PROGRAM_NAME}</strong> <span className="sd-gr-id">{item.PROGRAM_ID}</span></li>)}</ul></> : null}
   {review.ADDED_AFTER_ANALYSIS.length ? <><p>분석 이후 대장에 등록된 프로그램 {review.ADDED_AFTER_ANALYSIS.length}건이 있습니다. 중복이 아닌지 확인하세요.</p>
    <ul>{review.ADDED_AFTER_ANALYSIS.map(item => <li key={item.PROGRAM_ID}><strong>{item.PROGRAM_NAME}</strong> <span className="sd-gr-id">{item.PROGRAM_ID}</span></li>)}</ul></> : null}
   {review.SIMILAR_NAMES.length ? <><p>이름이 비슷한 프로그램입니다. 의미가 같은지는 직접 판단하세요.</p>
    <ul>{review.SIMILAR_NAMES.map(item => <li key={`${item.CANDIDATE_INDEX}:${item.PROGRAM_ID}`}>{item.CANDIDATE_NAME} ≈ <strong>{item.PROGRAM_NAME}</strong> <span className="sd-gr-id">{item.PROGRAM_ID}</span></li>)}</ul></> : null}
   <div className="sd-gp-actions">
    <button type="button" className="secondary-button" disabled={busy} onClick={() => setReview(null)}>닫기</button>
    {review.NAME_CONFLICTS.length ? null : <button type="button" className="primary-button" disabled={busy} onClick={() => void register(true)}>확인했습니다. 신규로 등록</button>}
   </div>
  </div> : null}
  <div className="sd-gp-actions">
   <span className="sd-analysis-help">{selected.size ? `${selected.size}건 선택됨` : '등록할 후보를 선택하세요. 재사용·변경·검토 필요 후보는 등록할 수 없습니다.'}</span>
   <button type="button" className="primary-button" disabled={busy || loading || !selected.size} onClick={() => void register(false)}>선택 후보를 프로그램 대장에 등록</button>
  </div>
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
  { key: 'PROGRAM_KIND', header: '유형', width: 90, render: program => programKindLabel(program.PROGRAM_KIND) || '-' },
  { key: 'DESCRIPTION', header: '설명', minWidth: 220, flex: 3, render: program => program.DESCRIPTION || '등록된 내용 없음' },
  { key: 'REQUIREMENTS', header: '담당 요구사항', minWidth: 220, flex: 3, render: program => program.EVIDENCE.length ? program.EVIDENCE.map(item => snapshotName(item.SNAPSHOT_JSON) || item.REQUIREMENT_ID).join(', ') : '-' },
  { key: 'SOURCE', header: '출처', minWidth: 160, render: program => program.SOURCE_ANALYSIS_ID ? `AI 분석 ${program.SOURCE_ANALYSIS_ID}` : '수동' },
 ];
 return <div className="sd-group-analysis">
  <section className="sd-gp-intro" aria-label="STEP 03 안내">
   <h4>AI 프로그램 목록 제안</h4>
   <p>STEP 02의 그룹 구성과 요구사항 내용(원문·업무 프로세스·설계 의견)을 기반으로, 프로젝트의 기존 프로그램 대장과 비교해 필요한 프로그램을 제안합니다. 프로그램은 화면·배치·연동·보고서로 구분되며, 화면 설계는 유형이 '화면'인 프로그램이 대상입니다.</p>
   <ol className="sd-gr-steps" aria-label="진행 순서">
    {guide.map((label, index) => <li key={label}><span className="sd-gr-step-no" aria-hidden="true">{index + 1}</span><span>{label}</span></li>)}
   </ol>
  </section>
  <RequirementGroupAnalysis key={`${group.REQUIREMENT_GROUP_ID}:programs`} fixedType="GROUP_PROGRAMS" onRunsChange={onRunsChange} group={group} embedded blocked={blocked} projectName={projectName} onClose={onClose}
   renderResult={run => <ProgramCandidates key={run.ANALYSIS_ID} group={group} run={run} onAdopted={refresh} />} />
  <section className="sd-gp-registered-list" aria-label="이 그룹의 프로그램 목록">
   <div className="sd-gp-bar"><h4>이 그룹의 프로그램 목록</h4>{current && registered.rows ? <span className="sd-gr-badge">{registered.rows.length}건</span> : null}</div>
   {registered.error && current ? <BaseKitMessage type="error" message={registered.error} /> : null}
   <DataTable columns={columns} rows={current ? registered.rows ?? [] : []} getRowKey={program => program.PROGRAM_ID} emptyMessage="이 그룹에서 등록한 프로그램이 없습니다. 분석 후보를 선택해 등록하세요." />
  </section>
  <details className="sd-analysis-technical" open={legacyOpen} onToggle={event => setLegacyOpen(event.currentTarget.open)}>
   <summary>설계 개요 분석 · 이전 방식(참고용)</summary>
   {legacyOpen ? <RequirementGroupAnalysis key={`${group.REQUIREMENT_GROUP_ID}:design`} fixedType="GROUP_DESIGN" onRunsChange={onRunsChange} group={group} initialAnalysisId={initialAnalysisId} embedded blocked={blocked} projectName={projectName} onClose={onClose} /> : null}
  </details>
 </div>;
}
