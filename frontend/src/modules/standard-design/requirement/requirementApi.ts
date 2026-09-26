export interface RequirementAttachment {
  ATTACHMENT_ID: string;
  REQUIREMENT_ID: string;
  ORIGINAL_FILE_NAME: string;
  MIME_TYPE: string;
  FILE_SIZE: number;
  UPLOAD_DT: string;
  ANALYSIS_STATUS: string;
}
export interface RequirementUploadPolicy {
  MAX_FILE_SIZE: number;
  MAX_REQUEST_SIZE: number;
  MAX_FILES: number;
  ALLOWED_EXTENSIONS: string[];
  ALLOWED_MIME_TYPES: string[];
  MIME_BY_EXTENSION: Record<string, string>;
}
export interface Requirement {
  REQUIREMENT_ID: string;
  PROJECT_ID: string;
  REQUIREMENT_NAME: string;
  REQUIREMENT_TYPE_CODE: string;
  DESCRIPTION: string;
  PROCESS_DESCRIPTION: string;
  STATUS: string;
  MENU_KEYS: string[];
  ATTACHMENTS: RequirementAttachment[];
  LEGACY_SOURCE_ID?: string;
}
export type RequirementInput = Pick<Requirement, 'PROJECT_ID' | 'REQUIREMENT_NAME' | 'REQUIREMENT_TYPE_CODE' | 'DESCRIPTION' | 'PROCESS_DESCRIPTION' | 'STATUS' | 'MENU_KEYS'> & {
  LEGACY_SOURCE_ID?: string;
  LEGACY_WBS_IDS?: string;
  LEGACY_SCREEN_IDS?: string;
  LEGACY_TABLE_IDS?: string;
};
const base = '/api/standard-design/requirements';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { MESSAGE?: string; FIELD_ERRORS?: { FIELD_NAME: string; MESSAGE: string }[] };
    throw new Error(error.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ') || error.MESSAGE || '요구사항 요청을 처리하지 못했습니다.');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json() as { DATA: T }).DATA;
}
const json = (method: string, body: RequirementInput): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const requirementApi = {
  list: (projectId: string) => request<Requirement[]>(`?PROJECT_ID=${encodeURIComponent(projectId)}`),
  create: (body: RequirementInput) => request<Requirement>('', json('POST', body)),
  update: (id: string, body: RequirementInput) => request<Requirement>(`/${encodeURIComponent(id)}`, json('PUT', body)),
  delete: (id: string) => request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadPolicy: () => request<RequirementUploadPolicy>('/attachments/policy'),
  fileUrl: (id: string, attachmentId: string) => `${base}/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/file`,
  deleteFile: (id: string, attachmentId: string) => request<void>(`/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' }),
};
