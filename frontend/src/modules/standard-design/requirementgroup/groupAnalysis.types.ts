export interface GroupAnalysis {
 ANALYSIS_ID: string; REQUIREMENT_GROUP_ID: string; GROUP_VERSION: number; REQUEST_ID: string;
 MODEL_NAME: string; PROMPT_VERSION: string; STATUS: 'RUNNING'|'SUCCEEDED'|'CALL_FAILED'|'PARSE_FAILED';
 CREATED_AT: string; COMPLETED_AT?: string; ERROR_MESSAGE?: string; REQUEST_JSON?: string; RESPONSE_RAW_JSON?: string;
 RESPONSE?: { summary: {text: string}; businessStructure: Record<string,unknown>[]; processes: Record<string,unknown>[]; screenCandidates: Record<string,unknown>[]; programCandidates: Record<string,unknown>[]; observations: Record<string,unknown>[] };
 WARNINGS?: string[];
}
