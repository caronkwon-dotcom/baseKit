interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
}

interface ErrorResponse {
  MESSAGE?: string;
}

export interface CompanyLlmTestResult {
  MODEL: string;
  CONTENT: string;
}

export async function testCompanyLlm(message: string): Promise<CompanyLlmTestResult> {
  const response = await fetch('/api/standard-design/v1/llm/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ MESSAGE: message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(error.MESSAGE ?? '회사 LLM 연결을 확인하지 못했습니다.');
  }

  const payload = await response.json() as ApiResponse<CompanyLlmTestResult>;
  return payload.DATA;
}
