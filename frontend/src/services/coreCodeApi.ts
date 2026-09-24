import type { Code, CodeAttributeDefinition, CodeAttributeValue, CodeGroup } from '../types';

interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
}

interface ErrorResponse {
  MESSAGE?: string;
  FIELD_ERRORS?: Array<{ FIELD_NAME: string; MESSAGE: string }>;
}
export interface BatchChangeSet<T> { INSERTED: T[]; UPDATED: T[]; DELETED: string[]; }
type GroupSave = Pick<CodeGroup, 'CODE_GROUP_ID' | 'CODE_GROUP_NAME' | 'DESCRIPTION' | 'USE_YN'>;
type CodeSave = Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN' | 'ATTRIBUTE_VALUES'>;
type AttributeSave = Omit<CodeAttributeDefinition, 'ATTRIBUTE_DEF_ID' | 'CODE_GROUP_ID' | 'DEL_YN' | 'REG_DT' | 'REG_BY' | 'MOD_DT' | 'MOD_BY'>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/codes${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    const fieldMessage = error.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ');
    throw new Error(fieldMessage || error.MESSAGE || '공통코드 요청을 처리하지 못했습니다.');
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
  saveGroupBatch: (changes: BatchChangeSet<GroupSave>) => request('/groups/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }),
  findCodes: (codeGroupId = '', codeName = '', useYn = '') =>
    request<Code[]>(queryString({ CODE_GROUP_ID: codeGroupId, CODE_NAME: codeName, USE_YN: useYn })),
  createCode: (code: Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN' | 'ATTRIBUTE_VALUES'>) =>
    request<Code>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(code) }),
  updateCode: (code: Pick<Code, 'CODE_ID' | 'CODE_GROUP_ID' | 'CODE' | 'CODE_NAME' | 'SORT_ORDER' | 'USE_YN' | 'ATTRIBUTE_VALUES'>) =>
    request<Code>(`/${encodeURIComponent(code.CODE_ID)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(code) }),
  deleteCode: (codeId: string) =>
    request<void>(`/${encodeURIComponent(codeId)}`, { method: 'DELETE' }),
  saveCodeBatch: (groupId: string, changes: BatchChangeSet<CodeSave>) => request(`/groups/${encodeURIComponent(groupId)}/codes/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }),
  findAttributeDefinitions: (codeGroupId: string) => request<CodeAttributeDefinition[]>(`/groups/${encodeURIComponent(codeGroupId)}/attribute-definitions`),
  findAttributeValues: (codeGroupId: string) => request<CodeAttributeValue[]>(`/groups/${encodeURIComponent(codeGroupId)}/attribute-values`),
  createAttributeDefinition: (codeGroupId: string, value: Omit<CodeAttributeDefinition, 'ATTRIBUTE_DEF_ID' | 'CODE_GROUP_ID' | 'DEL_YN' | 'REG_DT' | 'REG_BY' | 'MOD_DT' | 'MOD_BY'>) =>
    request<CodeAttributeDefinition>(`/groups/${encodeURIComponent(codeGroupId)}/attribute-definitions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }),
  updateAttributeDefinition: (attributeDefId: string, value: Omit<CodeAttributeDefinition, 'ATTRIBUTE_DEF_ID' | 'CODE_GROUP_ID' | 'DEL_YN' | 'REG_DT' | 'REG_BY' | 'MOD_DT' | 'MOD_BY'>) =>
    request<CodeAttributeDefinition>(`/attribute-definitions/${encodeURIComponent(attributeDefId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }),
  deleteAttributeDefinition: (attributeDefId: string) => request<void>(`/attribute-definitions/${encodeURIComponent(attributeDefId)}`, { method: 'DELETE' }),
  saveAttributeBatch: (groupId: string, changes: { INSERTED: AttributeSave[]; UPDATED: { ATTRIBUTE_DEF_ID: string; VALUE: AttributeSave }[]; DELETED: string[] }) => request(`/groups/${encodeURIComponent(groupId)}/attributes/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }),
};
