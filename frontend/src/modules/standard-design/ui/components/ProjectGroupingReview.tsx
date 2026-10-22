import { useState } from 'react';
import ProjectGroupingWorkspace, { type GroupingResultProps } from './ProjectGroupingWorkspace';
import { type Requirement } from '../../requirement/requirementApi';
import './projectGroupingReview.css';

const empty = '등록된 내용 없음';

// Read the revision used by the analysis, never silently substitute today's content.
function ReviewResults({ run, draft, view, renderGroup }: GroupingResultProps) {
  const [activeId, setActiveId] = useState('');
  const [expansion, setExpansion] = useState<{ groupId: string; ids: string[] }>({ groupId: '', ids: [] });
  // ProjectGroupingService stores the complete RequirementData in REQUEST_JSON / INPUT.
  const requirements = new Map(run.INPUT.map(input => [input.REQUIREMENT_ID, input as typeof input & Partial<Pick<Requirement, 'DESCRIPTION' | 'PROCESS_DESCRIPTION' | 'DESIGN_OPINION'>>]));
  const active = draft.GROUPS.find(group => group.GROUP_ID === activeId) ?? draft.GROUPS[0];
  return <div className={`pg-review pg-review--${view}`}>
    <nav className="pg-review-list" aria-label="추천 그룹 목록">
      {draft.GROUPS.map((group) => <button type="button" key={group.GROUP_ID} aria-current={active?.GROUP_ID === group.GROUP_ID ? 'true' : undefined} onClick={() => { if (active?.GROUP_ID !== group.GROUP_ID) setExpansion({ groupId: group.GROUP_ID, ids: [] }); setActiveId(group.GROUP_ID); }}>
        <span className="pg-review-count">요구사항 {group.MEMBERS.length}건</span>
        <strong>{group.TITLE}</strong><p>{empty}</p>
      </button>)}
      {!draft.GROUPS.length && <p>추천 그룹이 없습니다.</p>}
    </nav>
    <section className="pg-review-detail" aria-label="선택 그룹 상세">
      {active ? renderGroup(active, draft.GROUPS.indexOf(active), {
        reason: <><div className="pg-review-description"><h4>그룹 설명</h4><p>{empty}</p></div>
          <section className="pg-review-reason"><h4>AI가 이 그룹으로 묶은 이유</h4><p>{(run.AI_DRAFT ?? run.DRAFT)?.GROUPS.find(group => group.GROUP_ID === active.GROUP_ID)?.REASON || empty}</p></section>
          <div className="pg-review-members-heading"><h4>포함 요구사항 · {active.MEMBERS.length}건</h4><div className="pg-review-expand-controls" role="group" aria-label="포함 요구사항 펼침 제어"><button type="button" onClick={() => setExpansion({ groupId: active.GROUP_ID, ids: active.MEMBERS.map(member => member.REQUIREMENT_ID) })}>전체 펼치기</button><button type="button" onClick={() => setExpansion({ groupId: active.GROUP_ID, ids: [] })}>전체 접기</button></div></div></>,
        member: (id, reason) => {
          const requirement = requirements.get(id);
          const input = run.INPUT.find(item => item.REQUIREMENT_ID === id);
          return <details className="pg-review-row" key={run.ANALYSIS_ID + ':' + active.GROUP_ID + ':' + id} open={expansion.groupId === active.GROUP_ID && expansion.ids.includes(id)}>
            <summary onClick={event => { event.preventDefault(); setExpansion(previous => { const ids = previous.groupId === active.GROUP_ID ? previous.ids : []; return { groupId: active.GROUP_ID, ids: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] }; }); }}><small>{id} · 분석 기준 v{input?.REQUIREMENT_REVISION}</small><strong>{input?.REQUIREMENT_NAME || id}</strong><span className="pg-review-disclosure"><span className="pg-review-expand">펼치기</span><span className="pg-review-collapse">접기</span><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></summary>
            <div className="pg-review-fields">
              <dl><div><dt>요구사항 내용</dt><dd>{requirement?.DESCRIPTION || empty}</dd></div>
                <div><dt>업무 프로세스</dt><dd>{requirement?.PROCESS_DESCRIPTION || empty}</dd></div>
                <div><dt>설계 의견</dt><dd>{requirement?.DESIGN_OPINION || empty}</dd></div>
                <div><dt>개별 포함 사유</dt><dd>{reason || empty}</dd></div></dl>
            </div>
          </details>;
        },
      }) : <p>선택할 추천 그룹이 없습니다.</p>}
    </section>
  </div>;
}

export default function ProjectGroupingReview(props: { projectId: string; count: number; onBack: () => void }) {
  return <ProjectGroupingWorkspace {...props} Results={ReviewResults}/>;
}
