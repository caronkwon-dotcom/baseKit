import type { FunctionSpec } from './screenDesign.ts';

/** Function requirement logic (pure). Types come from screenDesign.ts; this file only imports them, so there is no runtime cycle. */

const ALLOWED_ACTIONS = ['SEARCH', 'CREATE', 'UPDATE', 'DELETE', 'SAVE', 'EXCEL_UPLOAD', 'EXCEL_DOWNLOAD', 'APPROVE'];
export const MAX_FUNCTIONS = 50;
export const MAX_LINES = 20;
export const MAX_LINE = 500;
export const MAX_DESCRIPTION = 2000;

/** Next stable ID: highest existing FN-nn plus one, so a removed ID is never reused. */
export function nextFunctionId(specs: readonly { FUNCTION_ID: string }[]): string {
  const highest = specs.reduce((max, spec) => { const match = /^FN-(\d+)$/.exec(spec.FUNCTION_ID); return match ? Math.max(max, Number(match[1])) : max; }, 0);
  return `FN-${String(highest + 1).padStart(2, '0')}`;
}

export const newFunctionSpec = (specs: readonly { FUNCTION_ID: string }[]): FunctionSpec =>
  ({ FUNCTION_ID: nextFunctionId(specs), NAME: '새 기능', ACTION_CODE: '', DESCRIPTION: '', RULES: [], VALIDATIONS: [], ACCEPTANCE: [], REQUIREMENT_IDS: [], SOURCE: 'USER' });

/** One line per item in the edit dialog. */
export const linesToText = (lines: readonly string[]) => lines.join('\n');
export const textToLines = (text: string) => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

/** Evidence requirements that no function points at ("누락 후보"). Order follows the evidence. */
export function uncoveredRequirements(specs: readonly { REQUIREMENT_IDS: readonly string[] }[], evidenceIds: readonly string[]): string[] {
  const covered = new Set(specs.flatMap(spec => spec.REQUIREMENT_IDS));
  return evidenceIds.filter(id => !covered.has(id));
}

/** First problem found, in plain language, or an empty string. The server repeats these checks. */
export function validateFunctionSpecs(specs: readonly FunctionSpec[], actionCodes: readonly string[], evidenceIds?: readonly string[]): string {
  if (specs.length > MAX_FUNCTIONS) return `기능 요건은 최대 ${MAX_FUNCTIONS}건까지 가능합니다.`;
  const seen = new Set<string>();
  const evidence = evidenceIds ? new Set(evidenceIds) : null;
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const label = `기능 요건 ${index + 1}번째`;
    if (!spec.FUNCTION_ID.trim()) return `${label} 기능ID가 없습니다.`;
    if (seen.has(spec.FUNCTION_ID)) return `기능 요건에 중복된 기능ID가 있습니다: ${spec.FUNCTION_ID}`;
    seen.add(spec.FUNCTION_ID);
    if (!spec.NAME.trim()) return `${label} 기능명을 입력하세요.`;
    if (spec.NAME.trim().length > 100) return `${label} 기능명은 100자 이하여야 합니다.`;
    if (spec.ACTION_CODE && !ALLOWED_ACTIONS.includes(spec.ACTION_CODE)) return `${label} ACTION_CODE가 허용되지 않습니다: ${spec.ACTION_CODE}`;
    if (spec.ACTION_CODE && !actionCodes.includes(spec.ACTION_CODE)) return `${label} ACTION_CODE(${spec.ACTION_CODE})는 "버튼 · Action" 탭에서 사용으로 선택한 것이어야 합니다.`;
    if (spec.DESCRIPTION.length > MAX_DESCRIPTION) return `${label} 설명은 ${MAX_DESCRIPTION}자 이하여야 합니다.`;
    for (const [name, lines] of [['처리 규칙', spec.RULES], ['검증·메시지', spec.VALIDATIONS], ['수용 기준', spec.ACCEPTANCE]] as const) {
      const used = lines.map(line => line.trim()).filter(Boolean);
      if (used.length > MAX_LINES) return `${label} ${name}은 최대 ${MAX_LINES}건까지 가능합니다.`;
      if (used.some(line => line.length > MAX_LINE)) return `${label} ${name}의 한 항목은 ${MAX_LINE}자 이하여야 합니다.`;
    }
    if (evidence) {
      const outside = spec.REQUIREMENT_IDS.find(id => !evidence.has(id));
      if (outside) return `${label} 근거 요구사항이 이 프로그램의 근거가 아닙니다: ${outside}`;
    }
  }
  return '';
}
