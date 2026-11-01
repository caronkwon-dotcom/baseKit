import { useEffect, useState, type ReactNode } from 'react';
import { BaseKitMessage, DataTable, type DataTableColumn } from '../../../../components/common';
import { projectGroupingApi, type GroupingMember, type GroupingRun } from '../../projectgrouping/projectGroupingApi';
import { groupStatusLabels, type GroupMember, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
import { compareGroupingResult, groupingNotices, groupingSourceOf, type DiffOrigin, type DiffRow } from '../../requirementgroup/groupingResult';
import './groupAnalysis.css';

const originLabels: Record<DiffOrigin, string> = { KEPT: 'AI 추천 유지', ADDED: '추가', EXCLUDED: '제외', UNKNOWN: '확인 불가' };
const stageLabels = { REVIEW: '등록 전 검토', AFTER: '등록 후 변경', '': '' } as const;
const mark = (value: boolean | null) => value === null ? '확인 불가' : value ? '포함' : '-';

/** Read-only view of the stored grouping result: final composition and AI recommendation stay in separate sections. */
export default function GroupingResultPanel({ group, auxiliary }: { group: RequirementGroup; auxiliary?: ReactNode }) {
 const source = groupingSourceOf(group.REQUEST_ID);
 const [state, setState] = useState<{ key: string; run: GroupingRun | null }>({ key: '', run: null });
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
 const originOf = new Map((comparison?.rows ?? []).map(row => [row.requirementId, row]));
 const revisionMismatch = group.MEMBERS.filter(member => member.REQUIREMENT && member.REQUIREMENT.REQUIREMENT_REVISION !== member.REVIEWED_REVISION).length;
 const discarded = group.MEMBERS.filter(member => member.REQUIREMENT?.DISCARDED_YN === 'Y').length;
 const notices = groupingNotices({ source, load, linked, hasReviewed: !!reviewed, hasAi: !!ai, humanCreated: !!reviewed && !ai && !!run?.AI_DRAFT, groupStatus: group.GROUP_STATUS, revisionMismatch, discarded });
 const nameOf = (id: string) => group.MEMBERS.find(member => member.REQUIREMENT_ID === id)?.REQUIREMENT?.REQUIREMENT_NAME ?? names.get(id) ?? '';

 const memberColumns: DataTableColumn<GroupMember>[] = [
  { key: 'REQUIREMENT_ID', header: 'ID', width: 150, render: member => member.REQUIREMENT_ID },
  { key: 'REQUIREMENT_NAME', header: '요구사항명', minWidth: 200, flex: 2, render: member => member.REQUIREMENT?.REQUIREMENT_NAME ?? '' },
  { key: 'INCLUSION_REASON', header: '포함 사유', minWidth: 220, flex: 3, render: member => member.INCLUSION_REASON || '-' },
  { key: 'ORIGIN', header: 'AI 추천 대비', width: 150, render: member => { const row = originOf.get(member.REQUIREMENT_ID); return row ? `${originLabels[row.origin]}${row.stage ? ` · ${stageLabels[row.stage]}` : ''}` : '-'; } },
  { key: 'SOURCE', header: '근거 분석', minWidth: 160, render: member => member.SOURCE_ANALYSIS_IDS.length ? member.SOURCE_ANALYSIS_IDS.join(', ') : '-' },
  { key: 'REVISION', header: '개정', width: 150, render: member => member.REQUIREMENT && member.REQUIREMENT.REQUIREMENT_REVISION !== member.REVIEWED_REVISION ? `불일치 (검토 r${member.REVIEWED_REVISION} → 현재 r${member.REQUIREMENT.REQUIREMENT_REVISION})` : '일치' },
 ];
 const aiColumns: DataTableColumn<GroupingMember>[] = [
  { key: 'REQUIREMENT_ID', header: 'ID', width: 150, render: member => member.REQUIREMENT_ID },
  { key: 'REQUIREMENT_NAME', header: '요구사항명', minWidth: 200, flex: 2, render: member => nameOf(member.REQUIREMENT_ID) },
  { key: 'REASON', header: 'AI 추천 사유', minWidth: 260, flex: 3, render: member => member.REASON || '-' },
  { key: 'FINAL', header: '최종 구성', width: 120, render: member => group.MEMBERS.some(item => item.REQUIREMENT_ID === member.REQUIREMENT_ID) ? '포함' : '제외' },
 ];
 const diffColumns: DataTableColumn<DiffRow>[] = [
  { key: 'REQUIREMENT_ID', header: 'ID', width: 150, render: row => row.requirementId },
  { key: 'REQUIREMENT_NAME', header: '요구사항명', minWidth: 180, flex: 2, render: row => nameOf(row.requirementId) },
  { key: 'AI', header: 'AI 최초 추천', width: 120, render: row => mark(row.inAi) },
  { key: 'REVIEWED', header: '등록 시점 검토본', width: 140, render: row => mark(row.inReviewed) },
  { key: 'FINAL', header: '현재 구성', width: 110, render: row => mark(row.inFinal) },
  { key: 'ORIGIN', header: '구분', width: 190, render: row => `${originLabels[row.origin]}${row.stage ? ` · ${stageLabels[row.stage]}` : ''}` },
  { key: 'REASON', header: '사유 변경', minWidth: 240, flex: 3, render: row => row.reasonChanged ? `${row.reviewedReason || '-'} → ${row.finalReason || '-'}` : '-' },
 ];
 const changedRows = (comparison?.rows ?? []).filter(row => row.origin === 'ADDED' || row.origin === 'EXCLUDED' || row.reasonChanged);
 const summary = comparison?.summary;
 const confirmed = group.GROUP_STATUS === 'CONFIRMED';

 return <div className="sd-group-analysis">
  <section aria-label="그룹 요약">
   <h3>{group.REQUIREMENT_GROUP_NAME}</h3>
   <p className="sd-analysis-help">상태 {groupStatusLabels[group.GROUP_STATUS]} · {confirmed ? `확정 v${group.VERSION}` : `현재 v${group.VERSION} · 확정 버전 아님`} · 포함 요구사항 {group.MEMBERS.length}건</p>
   <p>{group.DESCRIPTION || '설명이 없습니다.'}</p>
  </section>
  {notices.map((notice, index) => <BaseKitMessage key={index} type={notice.level} message={notice.text} />)}
  <section aria-label="최종 포함 요구사항">
   <h3>최종 포함 요구사항</h3>
   <p className="sd-analysis-help">현재 저장된 최종 구성입니다. AI 추천 원본과는 아래에서 구분해 표시합니다.</p>
   <DataTable columns={memberColumns} rows={group.MEMBERS} getRowKey={member => member.REQUIREMENT_ID} emptyMessage="포함된 요구사항이 없습니다." />
  </section>
  {ai ? <section aria-label="AI 그룹핑 추천 근거">
   <h3>AI 그룹핑 추천 근거</h3>
   <p className="sd-analysis-help">AI 최초 추천 원본(변경되지 않음) · 분석 {run?.ANALYSIS_ID} · {run ? new Date(run.CREATED_AT).toLocaleString('ko-KR') : ''}</p>
   <p><strong>{ai.TITLE}</strong>{ai.REASON ? ` — ${ai.REASON}` : ''}</p>
   <DataTable columns={aiColumns} rows={ai.MEMBERS} getRowKey={member => member.REQUIREMENT_ID} emptyMessage="AI가 추천한 구성원이 없습니다." />
  </section> : null}
  {comparison && summary ? <section aria-label="AI 추천과 최종 구성의 차이">
   <h3>{ai ? 'AI 최초 추천과 최종 구성의 차이' : '등록 시점 검토본과 현재 구성의 차이'}</h3>
   <p className="sd-analysis-help">유지 {summary.kept} · 추가 {summary.added.review + summary.added.after}(등록 전 {summary.added.review} / 등록 후 {summary.added.after}) · 제외 {summary.excluded.review + summary.excluded.after}(등록 전 {summary.excluded.review} / 등록 후 {summary.excluded.after}) · 사유 변경 {summary.reasonChanged}{summary.unknown ? ` · 확인 불가 ${summary.unknown}` : ''}</p>
   <DataTable columns={diffColumns} rows={changedRows} getRowKey={row => row.requirementId} emptyMessage="비교 대상보다 달라진 항목이 없습니다." />
  </section> : null}
  <section aria-label="표시할 수 없는 항목">
   <h3>저장된 데이터로 확인할 수 없는 항목</h3>
   <ul className="sd-analysis-help"><li>변경한 사람과 변경 시각(구성원 변경 이력이 저장되어 있지 않습니다.)</li><li>확정 버전별 구성 이력(확정 시점 구성은 화면에 제공되지 않습니다.)</li></ul>
  </section>
  {auxiliary}
 </div>;
}
