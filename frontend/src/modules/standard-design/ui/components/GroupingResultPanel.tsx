import { useEffect, useState, type ReactNode } from 'react';
import { BaseKitMessage, DataTable, type DataTableColumn } from '../../../../components/common';
import { projectGroupingApi, type GroupingRun } from '../../projectgrouping/projectGroupingApi';
import { groupStatusLabels, type GroupMember, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import { compareGroupingResult, groupingNotices, groupingSourceOf, memberBadge, type DiffOrigin, type DiffRow } from '../../requirementgroup/groupingResult';
import { parseDescription, parseProcess } from '../../requirementgroup/requirementText';
import './groupAnalysis.css';

const originLabels: Record<DiffOrigin, string> = { KEPT: 'AI 추천 유지', ADDED: '추가', EXCLUDED: '제외', UNKNOWN: '확인 불가' };
const stageLabels = { REVIEW: '등록 전 검토', AFTER: '등록 후 변경', '': '' } as const;
const empty = '등록된 내용 없음';

const section = (title: string, children: ReactNode, className = '') => <div className={`sd-gr-field ${className}`.trim()}><dt>{title}</dt><dd>{children}</dd></div>;
const none = <span className="sd-gr-empty">{empty}</span>;

function Description({ text }: { text: string | undefined }) {
 const lines = parseDescription(text);
 if (!lines.length) return none;
 // Consecutive bullets share one list so assistive technology reads them as a single list.
 const blocks: ({ kind: 'gap' } | { kind: 'meta'; text: string } | { kind: 'bullets'; items: string[] })[] = [];
 for (const line of lines) {
  const last = blocks[blocks.length - 1];
  if (line.kind === 'bullet') { if (last?.kind === 'bullets') last.items.push(line.text); else blocks.push({ kind: 'bullets', items: [line.text] }); }
  else if (line.kind === 'meta') blocks.push({ kind: 'meta', text: line.text });
  else blocks.push({ kind: 'gap' });
 }
 return <div className="sd-gr-text">{blocks.map((block, index) => block.kind === 'gap' ? <div key={index} className="sd-gr-gap" aria-hidden="true" /> : block.kind === 'meta' ? <p key={index} className="sd-gr-meta-line">{block.text}</p> : <ul key={index} className="sd-gr-bullets">{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>)}</div>;
}

function Process({ text }: { text: string | undefined }) {
 const view = parseProcess(text);
 if (view.mode === 'EMPTY') return none;
 if (view.mode === 'TEXT') return <p className="sd-gr-plain">{view.text}</p>;
 return <ol className={view.mode === 'CHIPS' ? 'sd-gr-steps' : 'sd-gr-steps sd-gr-steps--list'}>{view.steps.map((step, index) => <li key={index}><span className="sd-gr-step-no" aria-hidden="true">{index + 1}</span><span>{step}</span></li>)}</ol>;
}

function MemberCard({ member, badge, open, onToggle }: { member: GroupMember; badge: string; open: boolean; onToggle: () => void }) {
 const requirement = member.REQUIREMENT;
 const drifted = !!requirement && requirement.REQUIREMENT_REVISION !== member.REVIEWED_REVISION;
 const reasonLabel = badge === 'AI 추천' ? '포함 사유 (AI)' : badge === '직접 추가' ? '포함 사유 (사용자)' : '포함 사유';
 return <details className="sd-gr-card" open={open}>
  <summary aria-expanded={open} onClick={event => { event.preventDefault(); onToggle(); }}>
   <strong>{requirement?.REQUIREMENT_NAME || member.REQUIREMENT_ID}</strong>
   {badge ? <span className="sd-gr-badge">{badge}</span> : null}
   <span className="sd-gr-id">{member.REQUIREMENT_ID}</span>
  </summary>
  <div className="sd-gr-body">
   {drifted ? <BaseKitMessage type="warn" message={`검토 당시(r${member.REVIEWED_REVISION})와 다른 개정(현재 r${requirement.REQUIREMENT_REVISION})입니다. 아래는 현재 요구사항 기준입니다.`} /> : null}
   <div className="sd-gr-chips"><span className="sd-gr-chip">{member.REQUIREMENT_ID}</span>{requirement ? <span className="sd-gr-chip">분석 기준 v{requirement.REQUIREMENT_REVISION}</span> : null}</div>
   <dl className="sd-gr-fields">
    {section('요구사항 내용', <Description text={requirement?.DESCRIPTION} />)}
    {section('업무 프로세스', <Process text={requirement?.PROCESS_DESCRIPTION} />)}
    <div className="sd-gr-pair">
     {section('설계 의견', requirement?.DESIGN_OPINION ? <p className="sd-gr-plain">{requirement.DESIGN_OPINION}</p> : none, 'sd-gr-opinion')}
     {section(reasonLabel, member.INCLUSION_REASON ? <p className="sd-gr-plain">{member.INCLUSION_REASON}</p> : none, 'sd-gr-reason-box')}
    </div>
   </dl>
  </div>
 </details>;
}

/** Read-only view of a registered group: final composition as cards, AI reason and differences kept separate from it. */
export default function GroupingResultPanel({ group }: { group: RequirementGroup }) {
 const source = groupingSourceOf(group.REQUEST_ID);
 const [state, setState] = useState<{ key: string; run: GroupingRun | null }>({ key: '', run: null });
 const [expanded, setExpanded] = useState<{ groupId: string; ids: string[] }>({ groupId: '', ids: [] });
 const analysisId = source?.analysisId;
 useEffect(() => {
  if (!analysisId) return;
  let active = true;
  projectGroupingApi.get(group.PROJECT_ID, analysisId)
   .then(run => { if (active) setState({ key: analysisId, run }); })
   .catch(() => { if (active) setState({ key: analysisId, run: null }); });
  return () => { active = false; };
 }, [group.PROJECT_ID, analysisId]);

 const load = !source ? 'NONE' : state.key !== source.analysisId ? 'LOADING' : state.run ? 'READY' : 'ERROR';
 const run = load === 'READY' ? state.run : null;
 const linked = !!run && !!source && run.REGISTERED.some(item => item.DRAFT_GROUP_ID === source.draftGroupId && item.REQUIREMENT_GROUP_ID === group.REQUIREMENT_GROUP_ID);
 const reviewed = linked ? run?.DRAFT?.GROUPS.find(item => item.GROUP_ID === source?.draftGroupId) ?? null : null;
 const ai = linked ? run?.AI_DRAFT?.GROUPS.find(item => item.GROUP_ID === source?.draftGroupId) ?? null : null;
 const comparison = reviewed ? compareGroupingResult(group.MEMBERS, reviewed, ai) : null;
 const names = new Map((run?.INPUT ?? []).map(item => [item.REQUIREMENT_ID, item.REQUIREMENT_NAME]));
 const rowOf = new Map((comparison?.rows ?? []).map(row => [row.requirementId, row]));
 const revisionMismatch = group.MEMBERS.filter(member => member.REQUIREMENT && member.REQUIREMENT.REQUIREMENT_REVISION !== member.REVIEWED_REVISION).length;
 const discarded = group.MEMBERS.filter(member => member.REQUIREMENT?.DISCARDED_YN === 'Y').length;
 const notices = groupingNotices({ source, load, linked, hasReviewed: !!reviewed, hasAi: !!ai, humanCreated: !!reviewed && !ai && !!run?.AI_DRAFT, groupStatus: group.GROUP_STATUS, revisionMismatch, discarded });
 const nameOf = (id: string) => group.MEMBERS.find(member => member.REQUIREMENT_ID === id)?.REQUIREMENT?.REQUIREMENT_NAME ?? names.get(id) ?? id;

 const openIds = expanded.groupId === group.REQUIREMENT_GROUP_ID ? expanded.ids : [];
 const setIds = (ids: string[]) => setExpanded({ groupId: group.REQUIREMENT_GROUP_ID, ids });
 const toggle = (id: string) => setIds(openIds.includes(id) ? openIds.filter(value => value !== id) : [...openIds, id]);

 const diffColumns: DataTableColumn<DiffRow>[] = [
  { key: 'REQUIREMENT_NAME', header: '요구사항명', minWidth: 200, flex: 2, render: row => nameOf(row.requirementId) },
  { key: 'ORIGIN', header: '구분', width: 190, render: row => `${originLabels[row.origin]}${row.stage ? ` · ${stageLabels[row.stage]}` : ''}` },
  { key: 'REASON', header: '사유 변경', minWidth: 240, flex: 3, render: row => row.reasonChanged ? `${row.reviewedReason || '-'} → ${row.finalReason || '-'}` : '-' },
 ];
 const changedRows = (comparison?.rows ?? []).filter(row => row.origin === 'ADDED' || row.origin === 'EXCLUDED' || row.reasonChanged);
 const summary = comparison?.summary;
 const sourceText = run && linked ? `AI 그룹핑 · ${new Date(run.CREATED_AT).toLocaleString('ko-KR')}` : source ? 'AI 그룹핑 출처 확인 중' : 'AI 그룹핑 출처 없음';

 return <div className="sd-group-analysis">
  <section aria-label="그룹 헤더">
   <div className="sd-gr-head">
    <h3>{group.REQUIREMENT_GROUP_NAME}</h3>
    <span className="sd-gr-badge">{groupStatusLabels[group.GROUP_STATUS]}</span>
    <span className="sd-analysis-help">{sourceText} · 포함 요구사항 {group.MEMBERS.length}건</span>
   </div>
  </section>
  {notices.map((notice, index) => <BaseKitMessage key={index} type={notice.level} message={notice.text} />)}
  {ai ? <section className="sd-gr-reason" aria-label="AI가 이 그룹으로 묶은 이유">
   <h4>AI가 이 그룹으로 묶은 이유</h4>
   <p>{ai.REASON || empty}</p>
  </section> : null}
  <section aria-label="포함 요구사항">
   <div className="sd-gr-members-head">
    <h4>포함 요구사항 {group.MEMBERS.length}건</h4>
    <div role="group" aria-label="포함 요구사항 펼침 제어">
     <button type="button" className="secondary-button" onClick={() => setIds(group.MEMBERS.map(member => member.REQUIREMENT_ID))}>전체 펼치기</button>
     <button type="button" className="secondary-button" onClick={() => setIds([])}>전체 접기</button>
    </div>
   </div>
   {group.MEMBERS.length ? <div className="sd-gr-members">
    {group.MEMBERS.map(member => <MemberCard key={member.REQUIREMENT_ID} member={member} badge={memberBadge(rowOf.get(member.REQUIREMENT_ID))} open={openIds.includes(member.REQUIREMENT_ID)} onToggle={() => toggle(member.REQUIREMENT_ID)} />)}
   </div> : <p className="sd-analysis-help">포함된 요구사항이 없습니다.</p>}
  </section>
  {comparison && summary ? <section aria-label="AI 추천과 달라진 점">
   <h4>{ai ? 'AI 추천과 달라진 점' : '등록 시점 검토본과 달라진 점'}</h4>
   <p className="sd-analysis-help">유지 {summary.kept} · 추가 {summary.added.review + summary.added.after} · 제외 {summary.excluded.review + summary.excluded.after} · 사유 변경 {summary.reasonChanged}{summary.unknown ? ` · 확인 불가 ${summary.unknown}` : ''}</p>
   <DataTable columns={diffColumns} rows={changedRows} getRowKey={row => row.requirementId} emptyMessage="비교 대상보다 달라진 항목이 없습니다." />
  </section> : null}
 </div>;
}
