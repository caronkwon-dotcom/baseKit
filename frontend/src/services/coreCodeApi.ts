import type { Code, CodeGroup } from '../types';

interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
}

interface ErrorResponse {
  MESSAGE?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/codes${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(error.MESSAGE ?? '공통코드 요청을 처리하지 못했습니다.');
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as ApiResponse<T>;
  return payload.DATA;
}

function queryString(values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const coreCodeApi = {
  findGroups: (keyword = '', useYn = '') =>
    request<CodeGroup[]>(`/groups${queryString({ KEYWORD: keyword, USE_YN: useYn })}`),
  createGroup: (group: Pick<CodeGroup, 'CODE_GROUP_ID' | 'CODE_GROUP_NAME' | 'DESCRIPTION' | 'USE_YN'>) =>
    request<CodeGroup>('/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(group) }),
  updateGroup: (group: Pick<CodeGroup, 'CODE_GROUP_ID' | 'CODE_GROUP_NAME' | 'DESCRIPTION' | 'USE_YN'>) =>
    request<CodeGroup>(`/groups/${encodeURIComponent(group.CODE_GROUP_ID)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(group) }),
  deleteGroup: (codeGroupId: string) =>
    request<void>(`/groups/${encodeURIComponent(codeGroupId)}`, { method: 'DELETE' }),
  findCodes: (codeGroupId = '', codeName = '', useYn = '') =>
    request<Code[]>(queryString({ CODE_GROUP_ID: codeGroupId, CODE_NAME: codeName, USE_YN: useYn })),
  createCode: (code: Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN'>) =>
    request<Code>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(code) }),
  updateCode: (code: Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN'>) =>
    request<Code>(`/${encodeURIComponent(code.CODE_ID)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(code) }),
  deleteCode: (codeId: string) =>
    request<void>(`/${encodeURIComponent(codeId)}`, { method: 'DELETE' }),
};
