import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseKitMessage, BaseTabs, FormModal, type BaseTabDefinition } from '../../../../components/common';
import {
  acceptsResponse, analysisApi, analysisSteps, buildInput, canEdit, hasBlock, inputSignature, isRunning, needsReanalysis, statusLabels, stepOf, summarizeGeneration,
  AnalysisApiError, type Analysis, type AnalysisCandidate, type CandidateBody, type Generation,
} from '../../analysis/analysisApi';
import type { Requirement } from '../../requirement/requirementApi';
import type { ProjectMenu } from '../../projectmenu/projectMenuApi';

interface Props { projectId: string; requirements: Requirement[]; projectMenus: ProjectMenu[] }

const layouts = ['SINGLE', 'L1R2', 'L1R1', 'L2R1'];
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function RequirementAnalysisPanel({ projectId, requirements, projectMenus }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [opinions, setOpinions] = useState<Record<string, string>>({});
  const [overall, setOverall] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'warn' | 'error' | 'success'; text: string } | null>(null);
  const [tab, setTab] = useState('summary');
  const [editing, setEditing] = useState<{ id: string; draft: CandidateBody } | null>(null);
  const [showOriginal, setShowOriginal] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const currentId = useRef('');
  const pendingAnalysisRequest = useRef<string | null>(null);
  const pendingGenerationRequest = useRef<string | null>(null);

  const input = useMemo(() => buildInput(requirements, selectedIds, opinions, overall), [requirements, selectedIds, opinions, overall]);
  const signature = useMemo(() => inputSignature(input), [input]);
  const status = analysis?.ANALYSIS_STATUS ?? null;
  const locked = !!status && isRunning(status);

  const apply = useCallback((value: Analysis, hydrate = false) => {
    if (currentId.current && !acceptsResponse({ projectId, analysisId: currentId.current }, value)) return;
    currentId.current = value.ANALYSIS_ID;
    setAnalysis(value);
    if (hydrate) {
      setSelectedIds(value.REQUIREMENTS.map((r) => r.REQUIREMENT_ID));
      setOpinions(Object.fromEntries(value.REQUIREMENTS.map((r) => [r.REQUIREMENT_ID, r.DESIGN_OPINION ?? ''])));
      setOverall(value.OVERALL_OPINION ?? '');
    }
  }, [projectId]);

  const fail = useCallback((error: unknown) => {
    const text = error instanceof AnalysisApiError ? error.message : '서버에 연결하지 못했습니다. 잠시 후 상태를 다시 조회하세요.';
    setMessage({ type: 'error', text });
  }, []);

  const refresh = useCallback(async (id: string, hydrate = false) => {
    try { apply(await analysisApi.get(id), hydrate); } catch (error) { fail(error); }
  }, [apply, fail]);

  useEffect(() => {
    let active = true;
    analysisApi.list(projectId).then(async (items) => {
      if (!active) return;
      if (items.length) {
        const latest = await analysisApi.get(items[0].ANALYSIS_ID);
        if (!active) return;
        currentId.current = latest.ANALYSIS_ID;
        setAnalysis(latest);
        setSelectedIds(latest.REQUIREMENTS.map((r) => r.REQUIREMENT_ID));
        setOpinions(Object.fromEntries(latest.REQUIREMENTS.map((r) => [r.REQUIREMENT_ID, r.DESIGN_OPINION ?? ''])));
        setOverall(latest.OVERALL_OPINION ?? '');
        if (latest.ANALYSIS_STATUS === 'PARTIAL' || latest.ANALYSIS_STATUS === 'GENERATED' || latest.ANALYSIS_STATUS === 'GENERATION_UNKNOWN' || latest.ANALYSIS_STATUS === 'GENERATION_FAILED' || latest.ANALYSIS_STATUS === 'GENERATING')
          setGeneration(await analysisApi.generation(latest.ANALYSIS_ID));
      }
      setLoaded(true);
    }).catch((error) => { if (active) { fail(error); setLoaded(true); } });
    return () => { active = false; };
  }, [projectId, fail]);

  useEffect(() => {
    if (!analysis || analysis.ANALYSIS_STATUS !== 'ANALYZING') return undefined;
    const timer = window.setInterval(() => { void refresh(analysis.ANALYSIS_ID); }, 2000);
    return () => window.clearInterval(timer);
  }, [analysis, refresh]);

  // Input changed after a result exists: ask the server to mark the result STALE.
  useEffect(() => {
    if (!analysis || !(analysis.ANALYSIS_STATUS === 'REVIEW_READY' || analysis.ANALYSIS_STATUS === 'CONFIRMED') || !selectedIds.length) return undefined;
    const baseline = inputSignature({ REQUIREMENTS: analysis.REQUIREMENTS.map((r) => ({ REQUIREMENT_ID: r.REQUIREMENT_ID, MOD_DT: r.MOD_DT, DESIGN_OPINION: r.DESIGN_OPINION ?? '' })), OVERALL_OPINION: analysis.OVERALL_OPINION ?? '' });
    if (baseline === signature) return undefined;
    const timer = window.setTimeout(() => { analysisApi.checkInput(analysis.ANALYSIS_ID, input).then((value) => apply(value)).catch(fail); }, 500);
    return () => window.clearTimeout(timer);
  }, [analysis, signature, input, selectedIds.length, apply, fail]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    pendingAnalysisRequest.current ??= newId();
    const value = await analysisApi.create(projectId, pendingAnalysisRequest.current, input);
    pendingAnalysisRequest.current = null;
    currentId.current = value.ANALYSIS_ID;
    setAnalysis(value); setGeneration(null); setEditing(null);
  });
  const reanalyze = () => run(async () => {
    if (!analysis) return;
    const value = await analysisApi.reanalyze(analysis.ANALYSIS_ID, input);
    apply(value); setEditing(null);
  });
  const freshStart = () => { currentId.current = ''; setAnalysis(null); setGeneration(null); setEditing(null); setMessage(null); };

  const toggleRequirement = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);

  const toggleCandidate = (c: AnalysisCandidate) => run(async () => {
    if (!analysis) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, c.CANDIDATE_ID, { RESULT_VERSION: analysis.RESULT_VERSION, SELECTED: c.SELECTED_YN !== 'Y' }));
  });
  const saveEdit = () => run(async () => {
    if (!analysis || !editing) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, editing.id, { RESULT_VERSION: analysis.RESULT_VERSION, EDITED: editing.draft }));
    setEditing(null);
  });
  const resetEdit = (c: AnalysisCandidate) => run(async () => {
    if (!analysis) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, c.CANDIDATE_ID, { RESULT_VERSION: analysis.RESULT_VERSION, RESET: true }));
  });
  const confirm = () => run(async () => {
    if (!analysis) return;
    const ids = analysis.CANDIDATES.filter((c) => c.SELECTED_YN === 'Y' && c.GENERATED_YN === 'N').map((c) => c.CANDIDATE_ID);
    apply(await analysisApi.confirm(analysis.ANALYSIS_ID, analysis.RESULT_VERSION, ids));
    setMessage({ type: 'success', text: '선택한 후보를 확정했습니다. 생성 전에 후보를 수정하면 확정이 해제됩니다.' });
  });
  const generate = () => run(async () => {
    if (!analysis) return;
    pendingGenerationRequest.current ??= newId();
    setConfirmOpen(false);
    try {
      const result = await analysisApi.generate(analysis.ANALYSIS_ID, pendingGenerationRequest.current, analysis.RESULT_VERSION);
      setGeneration(result);
      if (result.STATUS === 'GENERATED') pendingGenerationRequest.current = null;
    } catch (error) {
      // The response may be lost after the server already created Programs: query the stored state first.
      if (!(error instanceof AnalysisApiError)) setGeneration(await analysisApi.generation(analysis.ANALYSIS_ID).catch(() => null));
      throw error;
    } finally {
      await refresh(analysis.ANALYSIS_ID);
    }
  });
  const queryGeneration = () => run(async () => { if (analysis) { setGeneration(await analysisApi.generation(analysis.ANALYSIS_ID)); await refresh(analysis.ANALYSIS_ID); } });

  const stale = status === 'STALE';
  const editable = !!status && canEdit(status);
  const step = stepOf(status);
  const selectedCandidates = analysis?.CANDIDATES.filter((c) => c.SELECTED_YN === 'Y' && c.GENERATED_YN === 'N') ?? [];
  const confirmedCount = analysis?.CANDIDATES.filter((c) => c.CONFIRMED_YN === 'Y' && c.GENERATED_YN === 'N').length ?? 0;
  const canConfirm = editable && !stale && selectedCandidates.length > 0 && selectedCandidates.every((c) => !hasBlock(c));
  const canGenerate = status === 'CONFIRMED' || status === 'PARTIAL' || status === 'GENERATION_FAILED' || status === 'GENERATION_UNKNOWN';

  const inputSection = <section className="sd-analysis-section" aria-label="요구사항 준비">
    <h4>1. 요구사항 준비 <small>({selectedIds.length}건 선택)</small></h4>
    <p className="sd-analysis-help">저장된 요구사항 본문과 의견만 전송됩니다. 첨부파일 본문은 분석하지 않습니다.</p>
    {requirements.length === 0 ? <p className="sd-analysis-help">분석할 요구사항이 없습니다.</p> : <table className="sd-analysis-table">
      <thead><tr><th scope="col" style={{ width: 36 }}>선택</th><th scope="col">요구사항</th><th scope="col">설계 의견</th></tr></thead>
      <tbody>{requirements.map((row) => <tr key={row.REQUIREMENT_ID}>
        <td><input type="checkbox" aria-label={`${row.REQUIREMENT_NAME} 선택`} checked={selectedIds.includes(row.REQUIREMENT_ID)} disabled={locked} onChange={() => toggleRequirement(row.REQUIREMENT_ID)} /></td>
        <td><strong>{row.REQUIREMENT_NAME}</strong><small>{row.REQUIREMENT_ID}</small></td>
        <td><textarea rows={2} aria-label={`${row.REQUIREMENT_NAME} 설계 의견`} value={opinions[row.REQUIREMENT_ID] ?? ''} disabled={locked || !selectedIds.includes(row.REQUIREMENT_ID)} onChange={(event) => setOpinions((current) => ({ ...current, [row.REQUIREMENT_ID]: event.target.value }))} /></td>
      </tr>)}</tbody>
    </table>}
    <label className="sd-analysis-field"><span>전체 의견</span><textarea rows={2} value={overall} disabled={locked} onChange={(event) => setOverall(event.target.value)} /></label>
    <div className="sd-analysis-actions">
      {!analysis && <button type="button" className="primary-button" disabled={busy || !selectedIds.length} onClick={start}>분석 시작</button>}
      {analysis && needsReanalysis(analysis.ANALYSIS_STATUS) && <button type="button" className="primary-button" disabled={busy || !selectedIds.length} onClick={reanalyze}>다시 분석</button>}
      {analysis && !locked && <button type="button" className="secondary-button" disabled={busy} onClick={freshStart}>새 분석 시작</button>}
    </div>
  </section>;

  const statusSection = analysis && (status === 'ANALYZING' || status === 'ANALYSIS_FAILED' || status === 'ANALYSIS_UNKNOWN') ? <section className="sd-analysis-section" aria-label="분석 상태">
    <h4>2. 분석</h4>
    {status === 'ANALYZING' && <BaseKitMessage type="info" message="분석 중입니다. 완료되면 자동으로 결과가 표시됩니다." detail="진행률은 제공되지 않으며 취소할 수 없습니다." />}
    {status !== 'ANALYZING' && <BaseKitMessage type="error" message={analysis.ERROR_MESSAGE ?? statusLabels[analysis.ANALYSIS_STATUS]} detail={`문의 시 요청 ID: ${analysis.REQUEST_ID}`} />}
  </section> : null;

  const resultTabs: BaseTabDefinition[] = analysis?.RESULT ? [
    { id: 'summary', label: '요약', content: <div className="sd-analysis-result">
      <h5>{analysis.RESULT.ANALYSIS_SUMMARY.TITLE}</h5><p>{analysis.RESULT.ANALYSIS_SUMMARY.SUMMARY}</p>
      <ListBlock title="핵심 사항" items={analysis.RESULT.ANALYSIS_SUMMARY.KEY_POINTS} />
      <ListBlock title="가정" items={analysis.RESULT.ANALYSIS_SUMMARY.ASSUMPTIONS} />
      <ListBlock title="미결정 항목" items={analysis.RESULT.ANALYSIS_SUMMARY.UNRESOLVED_ITEMS} />
    </div> },
    { id: 'structure', label: '업무메뉴·역할·액션', content: <div className="sd-analysis-result">
      <NamedBlock title="업무 메뉴" items={analysis.RESULT.BUSINESS_STRUCTURE.MENUS} />
      <NamedBlock title="역할" items={analysis.RESULT.BUSINESS_STRUCTURE.ROLES} />
      <NamedBlock title="액션" items={analysis.RESULT.BUSINESS_STRUCTURE.ACTIONS} />
      <p className="sd-analysis-help">제안 정보입니다. 시스템 Menu·Role·Action·권한은 자동 생성되지 않습니다.</p>
    </div> },
    { id: 'process', label: '프로세스', content: <div className="sd-analysis-result">
      <NamedBlock title="단계" items={analysis.RESULT.PROCESS_MODEL.STEPS} />
      <ListBlock title="흐름" items={analysis.RESULT.PROCESS_MODEL.TRANSITIONS.map((t) => `${t.FROM} → ${t.TO}`)} />
    </div> },
    { id: 'layout', label: 'Layout 추천', content: <div className="sd-analysis-result">
      <p><strong>{analysis.RESULT.LAYOUT_RECOMMENDATION.LAYOUT_TYPE}</strong></p>
      <ListBlock title="구성 요소" items={analysis.RESULT.LAYOUT_RECOMMENDATION.COMPONENTS} />
      {analysis.RESULT.LAYOUT_RECOMMENDATION.REASON && <p>{analysis.RESULT.LAYOUT_RECOMMENDATION.REASON}</p>}
    </div> },
    { id: 'candidates', label: 'SD 프로그램 후보', content: <div className="sd-analysis-result">
      <p className="sd-analysis-help">후보는 자동 선택되지 않습니다. 생성할 후보를 직접 선택하고 확정하세요. (선택 {selectedCandidates.length}건 · 확정 {confirmedCount}건)</p>
      <table className="sd-analysis-table">
        <thead><tr><th scope="col" style={{ width: 36 }}>선택</th><th scope="col">Program</th><th scope="col">검증</th><th scope="col" style={{ width: 150 }}>작업</th></tr></thead>
        <tbody>{analysis.CANDIDATES.map((c) => <tr key={c.CANDIDATE_ID} className={c.CONFIRMED_YN === 'Y' ? 'is-confirmed' : undefined}>
          <td><input type="checkbox" aria-label={`${c.EFFECTIVE.PROGRAM_NAME} 선택`} checked={c.SELECTED_YN === 'Y'} disabled={busy || !editable || c.GENERATED_YN === 'Y'} onChange={() => { void toggleCandidate(c); }} /></td>
          <td><strong>{c.EFFECTIVE.PROGRAM_NAME}</strong> {c.EDITED ? <span className="sd-analysis-badge">수정됨</span> : <span className="sd-analysis-badge sd-analysis-badge--llm">LLM 원본</span>}{c.CONFIRMED_YN === 'Y' && <span className="sd-analysis-badge sd-analysis-badge--ok">확정</span>}{c.GENERATED_YN === 'Y' && <span className="sd-analysis-badge sd-analysis-badge--ok">생성됨 {c.GENERATED_PROGRAM_ID}</span>}<small>{c.EFFECTIVE.PURPOSE}</small>
            {showOriginal === c.CANDIDATE_ID && <small className="sd-analysis-original">원본: {c.ORIGINAL.PROGRAM_NAME} — {c.ORIGINAL.PURPOSE}</small>}</td>
          <td>{c.ISSUES.length === 0 ? '-' : c.ISSUES.map((i) => <small key={i.CODE} className={i.LEVEL === 'BLOCK' ? 'sd-analysis-block' : 'sd-analysis-warn'}>{i.LEVEL === 'BLOCK' ? '오류' : '경고'}: {i.MESSAGE}</small>)}</td>
          <td className="sd-analysis-row-actions">
            <button type="button" className="secondary-button" disabled={busy || !editable || c.GENERATED_YN === 'Y'} onClick={() => setEditing({ id: c.CANDIDATE_ID, draft: structuredClone(c.EFFECTIVE) })}>편집</button>
            {c.EDITED && <button type="button" className="secondary-button" onClick={() => setShowOriginal(showOriginal === c.CANDIDATE_ID ? null : c.CANDIDATE_ID)}>원본 보기</button>}
            {c.EDITED && <button type="button" className="secondary-button" disabled={busy || !editable || c.GENERATED_YN === 'Y'} onClick={() => { void resetEdit(c); }}>원본 복원</button>}
          </td>
        </tr>)}</tbody>
      </table>
    </div> },
  ] : [];

  if (!loaded) return <p className="sd-analysis-help">분석 이력을 불러오는 중입니다.</p>;

  return <section className="sd-analysis" aria-label="요구사항 분석">
    <ol className="sd-analysis-steps" aria-label="진행 단계">{analysisSteps.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : undefined} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    {analysis && <p className="sd-analysis-status">상태: <strong>{statusLabels[analysis.ANALYSIS_STATUS]}</strong> · 분석 {analysis.ANALYSIS_ID} · 결과 v{analysis.RESULT_VERSION}</p>}
    {message && <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} />}
    {stale && <BaseKitMessage type="warn" message="입력이 변경되어 이전 결과가 최신이 아닙니다." detail="이전 결과는 참고용으로만 표시되며 후보 선택·편집·확정·생성이 중지됩니다. '다시 분석'을 실행하세요." />}
    {inputSection}
    {statusSection}
    {analysis?.RESULT && <section className="sd-analysis-section" aria-label="결과 검토">
      <h4>3. 결과 검토{stale ? ' (이전 결과)' : ''}</h4>
      <BaseTabs tabs={resultTabs} activeTab={tab} onChange={setTab} ariaLabel="분석 결과" />
      <div className="sd-analysis-actions">
        <button type="button" className="primary-button" disabled={busy || !canConfirm} onClick={confirm}>선택 후보 확정</button>
      </div>
    </section>}
    {analysis?.RESULT && <section className="sd-analysis-section" aria-label="확정·생성">
      <h4>4. 확정·생성</h4>
      <p className="sd-analysis-help">확정된 후보 {confirmedCount}건 · SD Program만 생성됩니다. Menu·Role·Action·Runtime·권한·DB Table·코드는 생성되지 않습니다.</p>
      <div className="sd-analysis-actions">
        <button type="button" className="primary-button" disabled={busy || stale || !canGenerate} onClick={() => setConfirmOpen(true)}>{status === 'PARTIAL' || status === 'GENERATION_FAILED' ? '실패 항목 재시도' : 'SD Program 생성'}</button>
        {(status === 'GENERATION_UNKNOWN' || status === 'GENERATING') && <button type="button" className="secondary-button" disabled={busy} onClick={queryGeneration}>생성 상태 조회</button>}
      </div>
      {generation && generation.ITEMS.length > 0 && <>
        <p className="sd-analysis-status">생성 결과: 성공 {summarizeGeneration(generation.ITEMS).success} · 실패 {summarizeGeneration(generation.ITEMS).failed}</p>
        <table className="sd-analysis-table"><thead><tr><th scope="col">후보</th><th scope="col">결과</th><th scope="col">SD Program ID</th><th scope="col">오류</th></tr></thead>
          <tbody>{generation.ITEMS.map((i) => <tr key={i.CANDIDATE_ID}><td>{i.PROGRAM_NAME}</td><td>{i.STATUS === 'SUCCESS' ? '성공' : i.STATUS === 'FAILED' ? '실패' : '대기'}</td><td>{i.PROGRAM_ID ?? '-'}</td><td>{i.ERROR_MESSAGE ?? '-'}</td></tr>)}</tbody></table>
      </>}
    </section>}

    <FormModal open={confirmOpen} title="SD Program 생성" submitLabel="생성" submitting={busy} onSubmit={() => { void generate(); }} onClose={() => setConfirmOpen(false)}>
      <p>확정된 {confirmedCount}건의 SD Program을 생성합니다.</p>
      <p className="sd-analysis-help">시스템 관리 Program·Runtime·권한에는 등록되지 않습니다.</p>
    </FormModal>
    <FormModal open={!!editing} title="후보 편집" submitLabel="저장" submitting={busy} onSubmit={() => { void saveEdit(); }} onClose={() => setEditing(null)}>
      {editing && <CandidateEditor draft={editing.draft} onChange={(draft) => setEditing({ id: editing.id, draft })} analysis={analysis} projectMenus={projectMenus} />}
    </FormModal>
  </section>;
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return <div><h6>{title}</h6><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function NamedBlock({ title, items }: { title: string; items: { TEMP_ID: string; NAME: string }[] }) {
  return <ListBlock title={title} items={items.map((item) => `${item.NAME} (${item.TEMP_ID})`)} />;
}

function CandidateEditor({ draft, onChange, analysis, projectMenus }: { draft: CandidateBody; onChange: (value: CandidateBody) => void; analysis: Analysis | null; projectMenus: ProjectMenu[] }) {
  const set = (patch: Partial<CandidateBody>) => onChange({ ...draft, ...patch });
  const menuNames = new Map((analysis?.RESULT?.BUSINESS_STRUCTURE.MENUS ?? []).map((m) => [m.TEMP_ID, m.NAME]));
  return <div className="sd-analysis-editor">
    <label className="sd-analysis-field"><span>Program명</span><input value={draft.PROGRAM_NAME} onChange={(event) => set({ PROGRAM_NAME: event.target.value })} /></label>
    <label className="sd-analysis-field"><span>목적</span><textarea rows={3} value={draft.PURPOSE} onChange={(event) => set({ PURPOSE: event.target.value })} /></label>
    <label className="sd-analysis-field"><span>Layout</span><select value={draft.LAYOUT_TYPE ?? ''} onChange={(event) => set({ LAYOUT_TYPE: event.target.value || undefined })}><option value="">선택 안 함</option>{layouts.map((l) => <option key={l}>{l}</option>)}</select></label>
    <fieldset className="sd-analysis-field"><legend>연결 요구사항</legend>{analysis?.REQUIREMENTS.map((r) => <label key={r.REQUIREMENT_ID}><input type="checkbox" checked={draft.SOURCE_REQUIREMENT_IDS.includes(r.REQUIREMENT_ID)} onChange={(event) => set({ SOURCE_REQUIREMENT_IDS: event.target.checked ? [...draft.SOURCE_REQUIREMENT_IDS, r.REQUIREMENT_ID] : draft.SOURCE_REQUIREMENT_IDS.filter((v) => v !== r.REQUIREMENT_ID) })} /> {r.REQUIREMENT_NAME}</label>)}</fieldset>
    {(draft.MENU_TEMP_IDS ?? []).map((tempId) => <label key={tempId} className="sd-analysis-field"><span>Menu 연결: {menuNames.get(tempId) ?? tempId}</span>
      <select value={draft.MENU_MAPPINGS?.[tempId] ?? ''} onChange={(event) => set({ MENU_MAPPINGS: { ...(draft.MENU_MAPPINGS ?? {}), [tempId]: event.target.value } })}>
        <option value="">연결 안 함</option>{projectMenus.map((m) => <option key={m.PROJECT_MENU_ID} value={m.PROJECT_MENU_ID}>{m.MENU_NAME} ({m.MENU_ID})</option>)}</select></label>)}
  </div>;
}
