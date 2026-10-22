import { useState } from 'react';
import ProjectGroupingWorkspace, { type GroupingResultProps } from './ProjectGroupingWorkspace';
import { type Requirement } from '../../requirement/requirementApi';
import './projectGroupingReview.css';

const empty = '등록된 내용 없음';

// Read the revision used by the analysis, never silently substitute today's content.
function ReviewResults({ run, draft, view, renderGroup }: GroupingResultProps) {
  const [activeId, setActiveId] = useState('');
  // ProjectGroupingService stores the complete RequirementData in REQUEST_JSON / INPUT.
  const requirements = new Map(run.INPUT.map(input => [input.REQUIREMENT_ID, input as typeof input & Partial<Pick<Requirement, 'DESCRIPTION' | 'PROCESS_DESCRIPTION' | 'DESIGN_OPINION'>>]));
  const active = draft.GROUPS.find(group => group.GROUP_ID === activeId) ?? draft.GROUPS[0];
  return <div className={`pg-review pg-review--${view}`}>
    <nav className="pg-review-list" aria-label="추천 그룹 목록">
      {draft.GROUPS.map((group, index) => <button type="button" key={group.GROUP_ID} aria-current={active?.GROUP_ID === group.GROUP_ID ? 'true' : undefined} onClick={() => setActiveId(group.GROUP_ID)}>
        <span>{String(index + 1).padStart(2, '0')} · {group.MEMBERS.length}건</span>
        <strong>{group.TITLE}</strong><p>{group.REASON || empty}</p>
      </button>)}
      {!draft.GROUPS.length && <p>추천 그룹이 없습니다.</p>}
    </nav>
    <section className="pg-review-detail" aria-label="선택 그룹 상세">
      {active ? renderGroup(active, draft.GROUPS.indexOf(active), {
        reason: <><div className="pg-review-description"><h4>그룹 설명</h4><p>{empty}</p></div>
          <section className="pg-review-reason"><h4>AI 그룹핑 사유</h4><p>{(run.AI_DRAFT ?? run.DRAFT)?.GROUPS.find(group => group.GROUP_ID === active.GROUP_ID)?.REASON || empty}</p></section>
          <h4>포함 요구사항 · {active.MEMBERS.length}건</h4></>,
        member: (id, reason) => {
          const requirement = requirements.get(id);
          const input = run.INPUT.find(item => item.REQUIREMENT_ID === id);
          return <details className="pg-review-row" key={run.ANALYSIS_ID + ':' + id}>
            <summary><small>{id} · 분석 기준 v{input?.REQUIREMENT_REVISION}</small><strong>{input?.REQUIREMENT_NAME || id}</strong><span>상세 보기</span></summary>
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
