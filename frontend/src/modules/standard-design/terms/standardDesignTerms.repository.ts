import type { StandardDesignTerm, StandardDesignTermLlmResult, StandardDesignTermPage } from './standardDesignTerms.types';

interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
}

interface ErrorResponse {
  MESSAGE?: string;
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(error.MESSAGE ?? '표준용어집을 조회하지 못했습니다.');
  }
  return (await response.json() as ApiResponse<T>).DATA;
}

export function searchStandardDesignTerms(keyword: string, page: number, size: number) {
  const params = new URLSearchParams({ keyword, page: String(page), size: String(size) });
  return request<StandardDesignTermPage>(`/api/standard-design/terms?${params.toString()}`);
}

export function getStandardDesignTerm(termId: string) {
  return request<StandardDesignTerm>(`/api/standard-design/terms/${encodeURIComponent(termId)}`);
}

export async function recommendStandardDesignTerm(question: string) {
  const response = await fetch('/api/standard-design/terms/llm/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(error.MESSAGE ?? '표준용어 추천 요청에 실패했습니다.');
  }
  return (await response.json() as ApiResponse<StandardDesignTermLlmResult>).DATA;
}
