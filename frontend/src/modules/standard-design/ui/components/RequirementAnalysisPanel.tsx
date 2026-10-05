import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseKitMessage, BaseTabs, FormModal, type BaseTabDefinition, type DataTableColumn } from '../../../../components/common';
import BaseKitDataGrid from '../../../../components/grid/BaseKitDataGrid';
import {
  acceptsResponse, analysisApi, analysisSteps, buildInput, candidateDiff, canEdit, hasBlock, inputSignature, isLocallyStale, isRunning, needsReanalysis, retryRequestId, statusLabels, stepOf, summarizeGeneration,
  AnalysisApiError, type Analysis, type AnalysisCandidate, type CandidateBody, type Generation, type GenerationItem,
} from '../../analysis/analysisApi';
import type { Requirement } from '../../requirement/requirementApi';
import type { ProjectMenu } from '../../projectmenu/projectMenuApi';

interface Props { projectId: string; requirements: Requirement[]; projectMenus: ProjectMenu[] }

const PROGRAM_KEY = 'SD_REQUIREMENT_DESIGN';
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
  const [checkFailure, setCheckFailure] = useState<string | null>(null);
  const [checkTick, setCheckTick] = useState(0);
  const [opinionRow, setOpinionRow] = useState<string | null>(null);
  const currentId = useRef('');
  const pendingAnalysisRequest = useRef<string | null>(null);
  const pendingGenerationRequest = useRef<string | null>(null);

  const input = useMemo(() => buildInput(requirements, selectedIds, opinions, overall), [requirements, selectedIds, opinions, overall]);
  const signature = useMemo(() => inputSignature(input), [input]);
  const status = analysis?.ANALYSIS_STATUS ?? null;
  const locked = !!status && isRunning(status);
  const stale = analysis ? isLocallyStale(analysis, input) : false;
  const needsCheck = !!analysis && stale && analysis.ANALYSIS_STATUS !== 'STALE' && selectedIds.length > 0;
  const checkKey = `${analysis?.ANALYSIS_ID}|${signature}|${checkTick}`;
  const inputCheck: 'idle' | 'checking' | 'failed' = !needsCheck ? 'idle' : checkFailure === checkKey ? 'failed' : 'checking';
  const inputBlocked = stale || inputCheck !== 'idle';

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
        if (latest.ANALYSIS_STATUS === 'PARTIAL' || latest.ANALYSIS_STATUS === 'GENERATED' || latest.ANALYSIS_STATUS === 'GENERATION_FAILED' || latest.ANALYSIS_STATUS === 'GENERATING')
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

  // Any input change makes the result STALE immediately (locally); the server is told afterwards. Failure keeps everything blocked.
  useEffect(() => {
    if (!needsCheck || !analysis) return undefined;
    const id = analysis.ANALYSIS_ID;
    const timer = window.setTimeout(() => {
      analysisApi.checkInput(id, input).then((value) => apply(value))
        .catch((error) => { setCheckFailure(checkKey); fail(error); });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCheck, analysis?.ANALYSIS_ID, signature, checkTick]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); } catch (error) { fail(error); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    pendingAnalysisRequest.current ??= newId();
    const value = await analysisApi.create(projectId, pendingAnalysisRequest.current, input);
    pendingAnalysisRequest.current = null; pendingGenerationRequest.current = null;
    currentId.current = value.ANALYSIS_ID;
    setAnalysis(value); setGeneration(null); setEditing(null);
  });
  const reanalyze = () => run(async () => {
    if (!analysis) return;
    await analysisApi.checkInput(analysis.ANALYSIS_ID, input);
    const value = await analysisApi.reanalyze(analysis.ANALYSIS_ID, input);
    pendingGenerationRequest.current = null; setGeneration(null);
    apply(value); setEditing(null);
  });
  const freshStart = () => { pendingGenerationRequest.current = null; currentId.current = ''; setAnalysis(null); setGeneration(null); setEditing(null); setMessage(null); };

  const changeRequirementSelection = (keys: Set<string>) => {
    if (locked) return;
    const next = requirements.map((row) => row.REQUIREMENT_ID).filter((id) => keys.has(id));
    setSelectedIds((current) => (current.length === next.length && current.every((id) => next.includes(id)) ? current : next));
  };

  const toggleCandidate = (c: AnalysisCandidate) => run(async () => {
    if (!analysis || inputBlocked) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, c.CANDIDATE_ID, { RESULT_VERSION: analysis.RESULT_VERSION, SELECTED: c.SELECTED_YN !== 'Y' }));
  });
  const saveEdit = () => run(async () => {
    if (!analysis || !editing || inputBlocked) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, editing.id, { RESULT_VERSION: analysis.RESULT_VERSION, EDITED: editing.draft }));
    setEditing(null);
  });
  // Grid selection mirrors SELECTED_YN; only a single, unblocked toggle is accepted (the grid re-syncs otherwise).
  const changeCandidateSelection = (keys: Set<string>) => {
    if (!analysis || busy || !editable) return;
    const changed = analysis.CANDIDATES.filter((c) => c.GENERATED_YN === 'N' && (c.SELECTED_YN === 'Y') !== keys.has(c.CANDIDATE_ID));
    if (changed.length === 1) void toggleCandidate(changed[0]);
  };
  const resetEdit = (c: AnalysisCandidate) => run(async () => {
    if (!analysis || inputBlocked) return;
    apply(await analysisApi.updateCandidate(analysis.ANALYSIS_ID, c.CANDIDATE_ID, { RESULT_VERSION: analysis.RESULT_VERSION, RESET: true }));
  });
  const confirm = () => run(async () => {
    if (!analysis || inputBlocked) return;
    const ids = analysis.CANDIDATES.filter((c) => c.SELECTED_YN === 'Y' && c.GENERATED_YN === 'N').map((c) => c.CANDIDATE_ID);
    try { apply(await analysisApi.confirm(analysis.ANALYSIS_ID, analysis.RESULT_VERSION, ids, input)); } catch (error) {
      if (error instanceof AnalysisApiError && error.code === 'ANALYSIS_STALE') await refresh(analysis.ANALYSIS_ID);
      throw error;
    }
    setMessage({ type: 'success', text: '선택한 후보를 확정했습니다. 생성 전에 후보를 수정하면 확정이 해제됩니다.' });
  });
  const generate = () => run(async () => {
    if (!analysis || inputBlocked || status === 'GENERATION_UNKNOWN') return;
    const requestId = retryRequestId(generation, analysis) ?? pendingGenerationRequest.current ?? newId();
    pendingGenerationRequest.current = requestId;
    setConfirmOpen(false);
    try {
      const result = await analysisApi.generate(analysis.ANALYSIS_ID, requestId, analysis.RESULT_VERSION, input);
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

  const editable = !!status && canEdit(status) && !inputBlocked;
  const step = stepOf(status);
  const selectedCandidates = analysis?.CANDIDATES.filter((c) => c.SELECTED_YN === 'Y' && c.GENERATED_YN === 'N') ?? [];
  const confirmedCount = analysis?.CANDIDATES.filter((c) => c.CONFIRMED_YN === 'Y' && c.GENERATED_YN === 'N').length ?? 0;
  const canConfirm = editable && !stale && selectedCandidates.length > 0 && selectedCandidates.every((c) => !hasBlock(c));
  const unknownGeneration = status === 'GENERATION_UNKNOWN';
  const canGenerate = !inputBlocked && !unknownGeneration && (status === 'CONFIRMED' || status === 'PARTIAL' || status === 'GENERATION_FAILED');
  const reqName = useMemo(() => new Map((analysis?.REQUIREMENTS ?? []).map((r) => [r.REQUIREMENT_ID, r.REQUIREMENT_NAME])), [analysis]);
  const sourceText = (ids: string[]) => ids.map((id) => `${id} ${reqName.get(id) ?? ''}`.trim()).join(', ') || '-';
  const tempNames = useMemo(() => { const r = analysis?.RESULT; const m = new Map<string, string>(); if (r) { [...r.BUSINESS_STRUCTURE.MENUS, ...r.BUSINESS_STRUCTURE.ROLES, ...r.BUSINESS_STRUCTURE.ACTIONS, ...r.PROCESS_MODEL.STEPS].forEach((n) => m.set(n.TEMP_ID, n.NAME)); } return m; }, [analysis]);
  const confirmTargets = analysis?.CANDIDATES.filter((c) => c.CONFIRMED_YN === 'Y' && c.GENERATED_YN === 'N') ?? [];

  const requirementColumns: DataTableColumn<Requirement>[] = [
    { key: 'REQUIREMENT_ID', header: '요구사항 ID', width: 150, render: (row) => row.REQUIREMENT_ID },
    { key: 'REQUIREMENT_NAME', header: '요구사항명', flex: 2, minWidth: 180, render: (row) => row.REQUIREMENT_NAME },
    { key: 'DESIGN_OPINION', header: '설계 의견', flex: 3, minWidth: 200, render: (row) => opinions[row.REQUIREMENT_ID] ?? '' },
  ];
  const opinionTarget = requirements.find((row) => row.REQUIREMENT_ID === opinionRow) ?? null;
  const inputSection = <section className="sd-analysis-section" aria-label="요구사항 준비">
    <h4>1. 요구사항 준비 <small>({selectedIds.length}건 선택)</small></h4>
    <p className="sd-analysis-help">저장된 요구사항 본문과 의견만 전송됩니다. 첨부파일 본문은 분석하지 않습니다. 행을 선택하면 아래에서 설계 의견을 입력합니다.</p>
    <div className="sd-analysis-grid"><BaseKitDataGrid<Requirement> programKey={PROGRAM_KEY} roleCode="ADMIN" title="분석 대상 요구사항" columns={requirementColumns} rows={requirements} getRowKey={(row) => row.REQUIREMENT_ID}
      selectedRowKeys={new Set(selectedIds)} onSelectedRowKeysChange={changeRequirementSelection} currentRowKey={opinionRow ?? undefined} onRowClick={(row) => setOpinionRow(row.REQUIREMENT_ID)} emptyMessage="분석할 요구사항이 없습니다." enabledActions={[]} toolbarActions={[]} /></div>
    {opinionTarget && <label className="sd-analysis-field"><span>{opinionTarget.REQUIREMENT_NAME} 설계 의견{selectedIds.includes(opinionTarget.REQUIREMENT_ID) ? '' : ' (선택한 요구사항만 입력 가능)'}</span>
      <textarea rows={2} aria-label={`${opinionTarget.REQUIREMENT_NAME} 설계 의견`} value={opinions[opinionTarget.REQUIREMENT_ID] ?? ''} disabled={locked || !selectedIds.includes(opinionTarget.REQUIREMENT_ID)} onChange={(event) => setOpinions((current) => ({ ...current, [opinionTarget.REQUIREMENT_ID]: event.target.value }))} /></label>}
    <label className="sd-analysis-field"><span>전체 의견</span><textarea rows={2} value={overall} disabled={locked} onChange={(event) => setOverall(event.target.value)} /></label>
    <div className="sd-analysis-actions">
      {!analysis && <button type="button" className="primary-button" disabled={busy || !selectedIds.length} onClick={start}>분석 시작</button>}
      {analysis && (needsReanalysis(analysis.ANALYSIS_STATUS) || stale) && <button type="button" className="primary-button" disabled={busy || !selectedIds.length || inputCheck === 'checking'} onClick={reanalyze}>다시 분석</button>}
      {analysis && !locked && <button type="button" className="secondary-button" disabled={busy} onClick={freshStart}>새 분석 시작</button>}
    </div>
  </section>;

  const statusSection = analysis && (status === 'ANALYZING' || status === 'ANALYSIS_FAILED' || status === 'ANALYSIS_UNKNOWN') ? <section className="sd-analysis-section" aria-label="분석 상태">
    <h4>2. 분석</h4>
    {status === 'ANALYZING' && <BaseKitMessage type="info" message="분석 중입니다. 완료되면 자동으로 결과가 표시됩니다." detail="진행률은 제공되지 않으며 취소할 수 없습니다." />}
    {status !== 'ANALYZING' && <BaseKitMessage type="error" message={analysis.ERROR_MESSAGE ?? statusLabels[analysis.ANALYSIS_STATUS]} detail={`문의 시 요청 ID: ${analysis.REQUEST_ID}`} />}
  </section> : null;

  const diffCandidate = analysis?.CANDIDATES.find((c) => c.CANDIDATE_ID === showOriginal) ?? null;
  const candidateColumns: DataTableColumn<AnalysisCandidate>[] = [
    { key: 'PROGRAM_NAME', header: 'SD Program', flex: 2, minWidth: 150, render: (c) => c.EFFECTIVE.PROGRAM_NAME },
    { key: 'STATE', header: '상태', width: 150, render: (c) => <>{c.EDITED ? <span className="sd-analysis-badge">수정됨</span> : <span className="sd-analysis-badge sd-analysis-badge--llm">LLM 원본</span>}{c.CONFIRMED_YN === 'Y' && <span className="sd-analysis-badge sd-analysis-badge--ok">확정</span>}{c.GENERATED_YN === 'Y' && <span className="sd-analysis-badge sd-analysis-badge--ok">생성됨</span>}</> },
    { key: 'SOURCE', header: '출처 Requirement', flex: 2, minWidth: 170, render: (c) => sourceText(c.EFFECTIVE.SOURCE_REQUIREMENT_IDS) },
    { key: 'PURPOSE', header: '목적', flex: 2, minWidth: 120, render: (c) => c.EFFECTIVE.PURPOSE },
    { key: 'ISSUES', header: '검증', flex: 1, minWidth: 100, render: (c) => c.ISSUES.length === 0 ? '-' : c.ISSUES.map((i) => `${i.LEVEL === 'BLOCK' ? '오류' : '경고'}: ${i.MESSAGE}`).join(' / ') },
    { key: 'ACTIONS', header: '작업', width: 230, render: (c) => <span className="sd-analysis-row-actions">
      <button type="button" className="secondary-button" disabled={busy || !editable || c.GENERATED_YN === 'Y'} onClick={() => setEditing({ id: c.CANDIDATE_ID, draft: structuredClone(c.EFFECTIVE) })}>편집</button>
      <button type="button" className="secondary-button" onClick={() => setShowOriginal(showOriginal === c.CANDIDATE_ID ? null : c.CANDIDATE_ID)}>원본 비교</button>
      {c.EDITED && <button type="button" className="secondary-button" disabled={busy || !editable || c.GENERATED_YN === 'Y'} onClick={() => { void resetEdit(c); }}>원본 복원</button>}
    </span> },
  ];

  const generationColumns: DataTableColumn<GenerationItem>[] = [
    { key: 'PROGRAM_NAME', header: '후보', flex: 2, minWidth: 180, render: (i) => i.PROGRAM_NAME },
    { key: 'SOURCE', header: '출처 Requirement', flex: 2, minWidth: 200, render: (i) => sourceText(analysis?.CANDIDATES.find((c) => c.CANDIDATE_ID === i.CANDIDATE_ID)?.EFFECTIVE.SOURCE_REQUIREMENT_IDS ?? []) },
    { key: 'STATUS', header: '결과', width: 80, render: (i) => i.STATUS === 'SUCCESS' ? '성공' : i.STATUS === 'FAILED' ? '실패' : '대기' },
    { key: 'PROGRAM_ID', header: 'SD Program ID', width: 160, render: (i) => i.PROGRAM_ID ?? '-' },
    { key: 'ERROR', header: '오류', flex: 2, minWidth: 160, render: (i) => i.ERROR_MESSAGE ?? '-' },
  ];

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
      <div className="sd-analysis-grid"><BaseKitDataGrid<AnalysisCandidate> programKey={PROGRAM_KEY} roleCode="ADMIN" title="SD 프로그램 후보" columns={candidateColumns} rows={analysis.CANDIDATES} getRowKey={(c) => c.CANDIDATE_ID}
        selectedRowKeys={new Set(analysis.CANDIDATES.filter((c) => c.SELECTED_YN === 'Y').map((c) => c.CANDIDATE_ID))} onSelectedRowKeysChange={changeCandidateSelection} emptyMessage="후보가 없습니다." enabledActions={[]} toolbarActions={[]} /></div>
      {diffCandidate && <div className="sd-analysis-original" aria-label="원본·편집본 비교">
        <h6>{diffCandidate.EFFECTIVE.PROGRAM_NAME} — 원본 / 편집본 비교</h6>
        <table className="sd-analysis-table"><thead><tr><th scope="col">항목</th><th scope="col">LLM 원본</th><th scope="col">현재(편집본)</th></tr></thead>
          <tbody>{candidateDiff(diffCandidate, (_kind, id) => tempNames.get(id) ?? id).map((row) => <tr key={row.label} className={row.changed ? 'is-changed' : undefined}><th scope="row">{row.label}{row.changed ? ' (변경)' : ''}</th><td>{row.original}</td><td>{row.edited}</td></tr>)}</tbody></table>
      </div>}
    </div> },
  ] : [];

  if (!loaded) return <p className="sd-analysis-help">분석 이력을 불러오는 중입니다.</p>;

  return <section className="sd-analysis" aria-label="요구사항 분석">
    <ol className="sd-analysis-steps" aria-label="진행 단계">{analysisSteps.map((label, index) => <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : undefined} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    {analysis && <p className="sd-analysis-status">상태: <strong>{statusLabels[analysis.ANALYSIS_STATUS]}</strong> · 분석 {analysis.ANALYSIS_ID} · 결과 v{analysis.RESULT_VERSION}</p>}
    {message && <BaseKitMessage type={message.type} message={message.text} dismissible onDismiss={() => setMessage(null)} />}
    {inputCheck === 'checking' && <BaseKitMessage type="info" message="입력 변경을 확인하는 중입니다. 확인이 끝날 때까지 후보 선택·편집·확정·생성이 중지됩니다." />}
    {inputCheck === 'failed' && <BaseKitMessage type="error" message="입력 변경 확인에 실패했습니다. 후보 선택·편집·확정·생성이 중지됩니다." detail="아래 '입력 확인 재시도'를 누르세요." />}
    {inputCheck === 'failed' && <div className="sd-analysis-actions"><button type="button" className="secondary-button" onClick={() => setCheckTick((n) => n + 1)}>입력 확인 재시도</button></div>}
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
      {unknownGeneration && <BaseKitMessage type="warn" message="생성 결과를 확인할 수 없습니다." detail="새 생성은 중지되었습니다. '생성 상태 조회'로 서버 상태를 먼저 확인하세요. 확인 후 실패 항목만 재시도할 수 있습니다." />}
      <div className="sd-analysis-actions">
        <button type="button" className="primary-button" disabled={busy || !canGenerate} onClick={() => setConfirmOpen(true)}>{status === 'PARTIAL' || status === 'GENERATION_FAILED' ? '실패 항목 재시도' : 'SD Program 생성'}</button>
        {(unknownGeneration || status === 'GENERATING' || generation) && <button type="button" className={unknownGeneration ? 'primary-button' : 'secondary-button'} disabled={busy} onClick={queryGeneration}>{unknownGeneration ? '생성 상태 조회' : '생성 결과 재조회'}</button>}
      </div>
      {generation && generation.ITEMS.length > 0 && <>
        <div className="sd-analysis-grid"><BaseKitDataGrid<GenerationItem> programKey={PROGRAM_KEY} roleCode="ADMIN" title="SD Program 생성 결과" columns={generationColumns} rows={generation.ITEMS} getRowKey={(i) => i.CANDIDATE_ID}
          selectable={false} emptyMessage="생성 결과가 없습니다." enabledActions={[]} toolbarActions={[]}
          metrics={[{ label: '성공', value: summarizeGeneration(generation.ITEMS).success, tone: 'accent' }, { label: '실패', value: summarizeGeneration(generation.ITEMS).failed, tone: 'danger' }]} /></div>
        {summarizeGeneration(generation.ITEMS).success > 0 && <p className="sd-analysis-help">생성된 SD Program은 서버 저장 결과(위 ID)를 기준으로 표시됩니다. 서버 재조회 결과만 확정 상태로 인정하세요.</p>}
      </>}
    </section>}
    <FormModal open={confirmOpen && !inputBlocked} title="SD Program 생성 확인" submitLabel="생성" submitting={busy} onSubmit={() => { void generate(); }} onClose={() => setConfirmOpen(false)}>
      <dl className="sd-analysis-summary">
        <dt>프로젝트</dt><dd>{projectId}</dd>
        <dt>생성 대상</dt><dd>{confirmTargets.length}건</dd>
      </dl>
      <ul>{confirmTargets.map((c) => <li key={c.CANDIDATE_ID}><strong>{c.EFFECTIVE.PROGRAM_NAME}</strong> — 출처: {sourceText(c.EFFECTIVE.SOURCE_REQUIREMENT_IDS)}{c.EDITED ? ` · 수정: ${candidateDiff(c, (_k, id) => tempNames.get(id) ?? id).filter((r) => r.changed).map((r) => r.label).join(', ')}` : ' · LLM 원본'}</li>)}</ul>
      <p className="sd-analysis-help">수정 요약: 수정된 후보 {confirmTargets.filter((c) => c.EDITED).length}건 / LLM 원본 {confirmTargets.filter((c) => !c.EDITED).length}건. 시스템 Menu·Role·Action·Runtime·권한·DB Table·코드는 생성되지 않으며 SD Program만 생성됩니다.</p>
    </FormModal>
    <FormModal open={!!editing && !inputBlocked} title="후보 편집" submitLabel="저장" submitting={busy} onSubmit={() => { void saveEdit(); }} onClose={() => setEditing(null)}>
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
