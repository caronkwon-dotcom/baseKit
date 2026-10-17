import LlmResultViewer from '../../../../components/common/LlmResultViewer';
import type { GroupAnalysisDisplay } from '../../requirementgroup/groupAnalysisAdapter';

/** SD document presentation; stored responses and COMMON rendering remain unchanged. */
export default function GroupAnalysisReport({ display, title, loading }: { display: GroupAnalysisDisplay; title: string; loading: boolean }) {
 const hasContent = display.SUMMARY || display.SECTIONS.some(section => section.ITEMS.length) || display.RECOMMENDATIONS.length || display.OBSERVATIONS.length;
 if (loading || !hasContent) return <LlmResultViewer result={display.VIEWER_RESULT} loading={loading} title={title} showRaw={false} />;
 const sections = [...display.SECTIONS].sort((a,b) => {
  const order = ['businessAreas','businessStructure','processCandidates','processes','programCandidates','screenCandidates'];
  return order.indexOf(a.KEY)-order.indexOf(b.KEY);
 });
 return <article className="sd-analysis-report">
  <header><p className="sd-analysis-eyebrow">분석 보고서 · 검토용 제안</p><h2>{title}</h2></header>
  {display.SUMMARY ? <section><h3>요약</h3><p>{display.SUMMARY}</p></section> : null}
  {sections.filter(section=>section.ITEMS.length).map(section=><section key={section.KEY}>
   <h3>{section.TITLE.replace('Program', '프로그램')}</h3>
   {section.ITEMS.map((item,index)=><div className="sd-analysis-entry" key={index}>
    <h4>{item.TITLE}</h4>
    {item.DESCRIPTION ? section.KEY === 'processCandidates' || section.KEY === 'processes'
     ? <><p className="sd-analysis-evidence">처리 흐름</p>{/→|->|\n/.test(item.DESCRIPTION)
       ? <ol className="sd-analysis-flow">{item.DESCRIPTION.split(/\s*(?:→|->)\s*|\n+/).filter(Boolean).map((step,stepIndex)=><li key={stepIndex}>{step}</li>)}</ol>
       : <p>{item.DESCRIPTION}</p>}</>
     : <>{section.KEY === 'programCandidates' || section.KEY === 'screenCandidates' ? <p className="sd-analysis-evidence">목적·기능</p> : null}<p>{item.DESCRIPTION}</p></> : null}
    {item.EVIDENCE_REQUIREMENT_IDS.length ? <p className="sd-analysis-evidence">근거 요구사항 · {item.EVIDENCE_REQUIREMENT_IDS.join(' · ')}</p> : null}
   </div>)}
  </section>)}
  {display.RECOMMENDATIONS.length ? <section><h3>추천 요구사항</h3><dl className="sd-analysis-recommendations">
   {display.RECOMMENDATIONS.map((item,index)=><div key={index}><dt>{item.REQUIREMENT_ID}</dt><dd>{item.REASON}</dd></div>)}
  </dl><p className="sd-analysis-evidence">기본정보의 추천 결과에서 선택하여 추가하세요.</p></section> : null}
  {display.OBSERVATIONS.length ? <section><h3>검토 의견</h3><ul>{display.OBSERVATIONS.map((item,index)=><li key={index}>{item}</li>)}</ul></section> : null}
 </article>;
}