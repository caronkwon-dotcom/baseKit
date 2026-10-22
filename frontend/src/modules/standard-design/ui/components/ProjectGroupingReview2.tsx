import { useState } from 'react';
import ProjectGroupingWorkspace, { type GroupingResultProps } from './ProjectGroupingWorkspace';
import { type Requirement } from '../../requirement/requirementApi';
import './projectGroupingReview2.css';

const empty = '등록된 내용 없음';
const states = { DRAFT: ['○', '검토 전'], APPROVED: ['✓', '검토 승인'], HOLD: ['Ⅱ', '보류'] } as const;

// Use the immutable analysis input, including its process and design opinion.
function Review2Results({ run, draft, view, renderGroup, selected = [] }: GroupingResultProps) {
  const [activeId, setActiveId] = useState('');
  const [expansion, setExpansion] = useState<{ groupId: string; ids: string[] }>({ groupId: '', ids: [] });
  const requirements = new Map(run.INPUT.map(input => [input.REQUIREMENT_ID, input as typeof input & Partial<Pick<Requirement, 'DESCRIPTION' | 'PROCESS_DESCRIPTION' | 'DESIGN_OPINION'>>]));
  const active = draft.GROUPS.find(group => group.GROUP_ID === activeId) ?? draft.GROUPS[0];
  const registered = new Set(run.REGISTERED.map(item => item.DRAFT_GROUP_ID));
  return <div className={`pg-review2 pg-review2--${view}`} aria-label="AI 그룹핑-2"><div className="pg-review2-content">
    <nav className="pg-review2-list" aria-label="추천 그룹 목록">
      <div className="pg-review2-list-heading"><h3>그룹 목록</h3><span>{draft.GROUPS.length}개</span></div>
      <div className="pg-review2-list-scroll">{draft.GROUPS.map((group, index) => <button type="button" key={group.GROUP_ID} aria-current={active?.GROUP_ID === group.GROUP_ID ? 'true' : undefined} onClick={() => { if (active?.GROUP_ID !== group.GROUP_ID) setExpansion({ groupId: group.GROUP_ID, ids: [] }); setActiveId(group.GROUP_ID); }}>
        <span className="pg-review2-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="pg-review2-list-copy"><strong>{group.TITLE}</strong><span className="pg-review2-meta"><span>요구사항 {group.MEMBERS.length}건</span><span className={`pg-review2-pill pg-review2-pill--${group.REVIEW_STATUS.toLowerCase()}`}>{states[group.REVIEW_STATUS][0]} {states[group.REVIEW_STATUS][1]}</span>{registered.has(group.GROUP_ID) ? <span className="pg-review2-registration">등록됨 · 초안</span> : selected.includes(group.GROUP_ID) && <span className="pg-review2-registration">등록 선택</span>}</span></span>
      </button>)}{!draft.GROUPS.length && <p>추천 그룹이 없습니다.</p>}</div>
    </nav>
    <section className="pg-review2-detail" aria-label="선택 그룹 상세">
      {active ? <><div className="pg-review2-eyebrow">GROUP {String(draft.GROUPS.indexOf(active) + 1).padStart(2, '0')} / {String(draft.GROUPS.length).padStart(2, '0')}</div>{renderGroup(active, draft.GROUPS.indexOf(active), {
        reason: <>
          <section className="pg-review2-reason"><span className="pg-review2-ai-icon" aria-hidden="true">✦</span><div><h4>AI가 이 그룹으로 묶은 이유</h4><p>{(run.AI_DRAFT ?? run.DRAFT)?.GROUPS.find(group => group.GROUP_ID === active.GROUP_ID)?.REASON || empty}</p></div></section>
          <div className="pg-review2-members-heading"><h4>포함 요구사항 <span>{active.MEMBERS.length}건</span></h4><div className="pg-review2-expand-controls" role="group" aria-label="포함 요구사항 펼침 제어"><button type="button" onClick={() => setExpansion({ groupId: active.GROUP_ID, ids: active.MEMBERS.map(member => member.REQUIREMENT_ID) })}>전체 펼치기</button><button type="button" onClick={() => setExpansion({ groupId: active.GROUP_ID, ids: [] })}>전체 접기</button></div></div></>,
        member: (id, reason) => {
          const requirement = requirements.get(id);
          return <details className="pg-review2-row" key={run.ANALYSIS_ID + ':' + active.GROUP_ID + ':' + id} open={expansion.groupId === active.GROUP_ID && expansion.ids.includes(id)}>
            <summary onClick={event => { event.preventDefault(); setExpansion(previous => { const ids = previous.groupId === active.GROUP_ID ? previous.ids : []; return { groupId: active.GROUP_ID, ids: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] }; }); }}><span className="pg-review2-id" title={id}>{id}</span><span className="pg-review2-row-copy"><strong>{requirement?.REQUIREMENT_NAME || id}</strong><span className="pg-review2-preview">{requirement?.DESCRIPTION || empty}</span></span><span className="pg-review2-disclosure" aria-hidden="true">▾</span></summary>
            <div className="pg-review2-fields"><div className="pg-review2-revision">{id} · 분석 기준 v{requirement?.REQUIREMENT_REVISION}</div>
              <dl><div className="pg-review2-primary"><dt>요구사항 내용</dt><dd>{requirement?.DESCRIPTION || empty}</dd></div>
                <div className="pg-review2-process"><dt>업무 프로세스</dt><dd>{requirement?.PROCESS_DESCRIPTION || empty}</dd></div>
                <div className={requirement?.DESIGN_OPINION ? 'pg-review2-opinion' : 'pg-review2-opinion pg-review2-empty'}><dt>설계 의견</dt><dd>{requirement?.DESIGN_OPINION || empty}</dd></div>
                {reason && <div className="pg-review2-member-reason"><dt>개별 포함 사유</dt><dd>{reason}</dd></div>}</dl>
            </div>
          </details>;
        },
      })}</> : <p>선택할 추천 그룹이 없습니다.</p>}
    </section>
  </div></div>;
}

export default function ProjectGroupingReview2(props: { projectId: string; count: number; onBack: () => void }) {
  return <ProjectGroupingWorkspace {...props} Results={Review2Results} resultLabel="AI 그룹핑-2"/>;
}
