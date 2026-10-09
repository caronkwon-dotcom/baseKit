export type GroupAnalysisStatus = 'RUNNING'|'SUCCESS'|'FAILED_TIMEOUT'|'FAILED_LLM'|'FAILED_INVALID_JSON'|'FAILED_TRUNCATED'|'SUCCEEDED'|'CALL_FAILED'|'PARSE_FAILED';
export interface GroupAnalysis {
 ANALYSIS_ID: string; REQUIREMENT_GROUP_ID: string; GROUP_VERSION: number; REQUEST_ID: string;
 MODEL_NAME: string; PROMPT_VERSION: string; STATUS: GroupAnalysisStatus;
 CREATED_AT: string; COMPLETED_AT?: string; ERROR_MESSAGE?: string; REQUEST_JSON?: string; RESPONSE_RAW_JSON?: string;
 HTTP_STATUS?: number; FINISH_REASON?: string; INPUT_TOKENS?: number; OUTPUT_TOKENS?: number; ELAPSED_MS?: number;
 RESPONSE?: { summary: {text: string}; businessAreas?: Record<string,unknown>[]; processCandidates?: Record<string,unknown>[]; programCandidates: Record<string,unknown>[]; observations: (string|Record<string,unknown>)[]; businessStructure?: Record<string,unknown>[]; processes?: Record<string,unknown>[]; screenCandidates?: Record<string,unknown>[] };
 WARNINGS?: string[];
}
