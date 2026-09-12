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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  let response: Response;
  try {
    response = await fetch('/api/standard-design/terms/llm/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('회사 LLM 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.', {
        cause: error,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(error.MESSAGE ?? '표준용어 추천 요청에 실패했습니다.');
  }
  return (await response.json() as ApiResponse<StandardDesignTermLlmResult>).DATA;
}
