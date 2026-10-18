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
  DESIGN_OPINION?: string;
  STATUS: string;
  MOD_DT: string;
  DISCARDED_YN: "Y" | "N";
  REQUIREMENT_REVISION: number;
  MENU_KEYS: string[];
  PROJECT_MENU_IDS: string[];
  ATTACHMENTS: RequirementAttachment[];
  LEGACY_SOURCE_ID?: string;
}
export type RequirementInput = Pick<Requirement, 'PROJECT_ID' | 'REQUIREMENT_NAME' | 'REQUIREMENT_TYPE_CODE' | 'DESCRIPTION' | 'PROCESS_DESCRIPTION' | 'DESIGN_OPINION' | 'STATUS' | 'MENU_KEYS' | 'PROJECT_MENU_IDS'> & {
  LEGACY_SOURCE_ID?: string;
  LEGACY_WBS_IDS?: string;
  LEGACY_SCREEN_IDS?: string;
  LEGACY_TABLE_IDS?: string;
};
export interface RequirementChange { REQUIREMENT_REVISION: number; BASE_REVISION: number; VERSION: number; CHANGE_STATE: string; CHANGE_REASON: string; CREATED_BY: string; CREATED_AT: string; UPDATED_AT: string; CONTENT: Requirement }
export interface RequirementRevisions { CURRENT: Requirement; READ_ONLY: boolean; DRAFT: RequirementChange | null; HISTORY: { REQUIREMENT_REVISION: number; EVENT_TYPE: string; CONTENT: Requirement }[]; CHANGES: RequirementChange[]; DISCARD: { DISCARD_REASON: string; DISCARDED_BY: string; DISCARDED_AT: string } | null }
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
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const requirementApi = {
  list: (projectId: string) => request<Requirement[]>(`?PROJECT_ID=${encodeURIComponent(projectId)}`),
  create: (body: RequirementInput) => request<Requirement>('', json('POST', body)),
  update: (id: string, body: RequirementInput) => request<Requirement>(`/${encodeURIComponent(id)}`, json('PUT', body)),
  delete: (id: string, reason: string) => request<void>(`/${encodeURIComponent(id)}`, json('DELETE', { REASON: reason })),
  revisions: (id: string) => request<RequirementRevisions>(`/${encodeURIComponent(id)}/revisions`),
  beginChange: (id: string, reason: string) => request<RequirementChange>(`/${encodeURIComponent(id)}/changes`, json('POST', { REASON: reason })),
  saveChange: (id: string, revision: number, version: number, content: RequirementInput) => request<RequirementChange>(`/${encodeURIComponent(id)}/changes`, json('PUT', { REVISION: revision, VERSION: version, CONTENT: content })),
  confirmChange: (id: string, revision: number, version: number) => request<Requirement>(`/${encodeURIComponent(id)}/changes/confirm`, json('POST', { REVISION: revision, VERSION: version })),
  cancelChange: (id: string, revision: number, version: number) => request<void>(`/${encodeURIComponent(id)}/changes/cancel`, json('POST', { REVISION: revision, VERSION: version })),
  uploadPolicy: () => request<RequirementUploadPolicy>('/attachments/policy'),
  fileUrl: (id: string, attachmentId: string) => `${base}/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/file`,
  deleteFile: (id: string, attachmentId: string, change?: { REVISION: number; VERSION: number }) => request<void>(`/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}${change ? `?REVISION=${change.REVISION}&VERSION=${change.VERSION}` : ''}`, { method: 'DELETE' }),
};
