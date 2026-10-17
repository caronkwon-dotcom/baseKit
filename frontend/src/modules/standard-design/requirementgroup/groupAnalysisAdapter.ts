import type { GroupAnalysis } from './groupAnalysis.types';

/** SD-owned display contract; not COMMON viewer Props or a selection/save DTO. */
export interface GroupAnalysisDisplay {
 VIEWER_RESULT: unknown;
 SCHEMA_VERSION: 1;
 ANALYSIS_ID: string;
 ANALYSIS_TYPE: string;
 STATUS: string;
 GROUP_VERSION: number | null;
 SUMMARY: string;
 SECTIONS: { KEY: string; TITLE: string; ITEMS: { TITLE: string; DESCRIPTION: string; EVIDENCE_REQUIREMENT_IDS: string[] }[] }[];
 RECOMMENDATIONS: { REQUIREMENT_ID: string; REASON: string }[];
 OBSERVATIONS: string[];
 WARNINGS: string[];
 SOURCE: { REQUEST_JSON: string | null; RESPONSE_RAW_JSON: string | null; RESPONSE_VALIDATED_JSON: string | null; RESPONSE_JSON: string | null };
}
type AnalysisInput = Omit<Partial<GroupAnalysis>, 'RESPONSE' | 'WARNINGS'> & {
 RESPONSE?: unknown; WARNINGS?: unknown; RESPONSE_VALIDATED_JSON?: string | null;
};
const object = (value: unknown): Record<string, unknown> | null =>
 value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Pure projection of a detail API result. Never changes stored JSON or business state. */
export function adaptGroupAnalysis(run: AnalysisInput): GroupAnalysisDisplay {
 const warnings = [...strings(run.WARNINGS)];
 const parse = (raw: string | null | undefined): unknown => {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as unknown; }
  catch { warnings.push('저장된 결과 JSON을 읽지 못했습니다. 원문을 확인하세요.'); return undefined; }
 };
 const success = run.STATUS === 'SUCCESS' || run.STATUS === 'SUCCEEDED';
 const recommendation = run.ANALYSIS_TYPE === 'GROUP_RECOMMENDATION';
 // Recommendation raw HTTP content is unvalidated and must never become selectable/display recommendations.
 let response: unknown = success ? run.RESPONSE : undefined;
 if (success && response == null) {
  const raw = recommendation ? run.RESPONSE_VALIDATED_JSON : run.RESPONSE_RAW_JSON;
  response = parse(raw) ?? (recommendation ? undefined : raw);
  const envelope = object(response);
  if (!recommendation && envelope && Array.isArray(envelope.choices)) {
   const message = object(object(envelope.choices[0])?.message);
   const content = text(message?.content);
   response = parse(content) ?? content;
  }
 }
 if (typeof response === 'string') response = parse(response) ?? response;
 const result = object(response);
 if (success && !result) warnings.push('표시할 결과가 없습니다. 상세 조회 결과와 원문을 확인하세요.');
 const sections: GroupAnalysisDisplay['SECTIONS'] = [];
 const definitions = [
  ['businessAreas', '업무영역'], ['businessStructure', '기존 업무 구조'],
  ['processCandidates', '프로세스 후보'], ['processes', '기존 프로세스'],
  ['screenCandidates', '기존 화면 후보'], ['programCandidates', 'Program 후보'],
 ] as const;
 if (result && !recommendation) for (const [key, title] of definitions) {
  if (!(key in result)) continue;
  const rows = result[key];
  if (!Array.isArray(rows)) { warnings.push(`${key}: 배열 형식을 확인하세요.`); continue; }
  const items: GroupAnalysisDisplay['SECTIONS'][number]['ITEMS'] = [];
  rows.forEach((value, index) => {
   const row = object(value);
   if (!row) { warnings.push(`${key}[${index}]: 항목 형식을 확인하세요.`); return; }
   const evidence = strings(row.evidenceRequirementIds);
   if (!evidence.length || !Array.isArray(row.evidenceRequirementIds) || evidence.length !== row.evidenceRequirementIds.length)
    warnings.push(`${key}[${index}]: 근거 ID를 확인하세요.`);
   items.push({ TITLE: text(row.name) || text(row.title) || `후보 ${index + 1}`,
    DESCRIPTION: text(row.description) || text(row.purpose), EVIDENCE_REQUIREMENT_IDS: evidence });
  });
  sections.push({ KEY: key, TITLE: title, ITEMS: items });
 }
 const recommendations: GroupAnalysisDisplay['RECOMMENDATIONS'] = [];
 if (result && recommendation) {
  if (!Array.isArray(result.recommendedRequirements)) warnings.push('recommendedRequirements: 배열 형식을 확인하세요.');
  else result.recommendedRequirements.forEach((value, index) => {
   const row = object(value);
   if (!text(row?.requirementId).trim() || !text(row?.reason).trim()) {
    warnings.push(`recommendedRequirements[${index}]: ID 또는 사유를 확인하세요.`); return;
   }
   recommendations.push({ REQUIREMENT_ID: text(row?.requirementId), REASON: text(row?.reason) });
  });
 }
 const observations: string[] = [];
 if (result?.observations != null) {
  if (!Array.isArray(result.observations)) warnings.push('observations: 배열 형식을 확인하세요.');
  else for (const item of result.observations) {
   if (typeof item === 'string') observations.push(item);
   else if (object(item)) observations.push(JSON.stringify(item));
   else warnings.push('observations: 항목 형식을 확인하세요.');
  }
 }
 const viewerResult = result ? {
  ...(text(object(result.summary)?.text) || text(result.summary) ? {summary: text(object(result.summary)?.text) || text(result.summary)} : {}),
  ...Object.fromEntries(sections.filter(section=>section.ITEMS.length).map(section=>[section.TITLE, {
   카드: section.ITEMS.map(item=>({title:item.TITLE, 설명:item.DESCRIPTION, 근거:item.EVIDENCE_REQUIREMENT_IDS.join(', ') || '확인 필요'})),
  }])),
  ...(recommendations.length ? {추천요구사항: {카드: recommendations.map(item=>({title:item.REQUIREMENT_ID, 추천사유:item.REASON}))}} : {}),
  ...(observations.length ? {확인필요사항: {목록:observations}} : {}),
  evidence: [...new Set(sections.flatMap(section=>section.ITEMS.flatMap(item=>item.EVIDENCE_REQUIREMENT_IDS)))],
 } : typeof response === 'string' && response.trim() ? response : {};
 return {
  VIEWER_RESULT: viewerResult,
  SCHEMA_VERSION: 1, ANALYSIS_ID: text(run.ANALYSIS_ID), ANALYSIS_TYPE: text(run.ANALYSIS_TYPE) || 'GROUP_DESIGN',
  STATUS: text(run.STATUS), GROUP_VERSION: typeof run.GROUP_VERSION === 'number' && Number.isFinite(run.GROUP_VERSION) ? run.GROUP_VERSION : null,
  SUMMARY: recommendation ? '' : text(object(result?.summary)?.text) || text(result?.summary),
  SECTIONS: sections, RECOMMENDATIONS: recommendations, OBSERVATIONS: observations, WARNINGS: warnings,
  SOURCE: { REQUEST_JSON: run.REQUEST_JSON ?? null, RESPONSE_RAW_JSON: run.RESPONSE_RAW_JSON ?? null,
   RESPONSE_VALIDATED_JSON: run.RESPONSE_VALIDATED_JSON ?? null, RESPONSE_JSON: result ? JSON.stringify(result) : null },
 };
}
