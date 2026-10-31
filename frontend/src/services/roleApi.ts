import type { BaseEntity, UseYn } from '../types/common';

export interface Role extends BaseEntity {
  ROLE_ID: string;
  ROLE_CODE: string;
  ROLE_NAME: string;
  DESCRIPTION: string | null;
  USE_YN: UseYn;
  DEL_YN: UseYn;
}

export interface RoleSave {
  ROLE_ID: string;
  ROLE_CODE: string;
  ROLE_NAME: string;
  DESCRIPTION: string | null;
  USE_YN: UseYn;
}

export interface RoleProgramPermission {
  PROGRAM_ID: string;
  PROGRAM_NAME: string;
  MODULE_CODE: string;
  ALLOW_YN: UseYn;
}

export interface RoleButtonGroupPermission {
  PROGRAM_ID: string;
  GROUP_CODE: string;
  GROUP_NAME: string;
  ALLOW_YN: UseYn;
}

export interface RolePermission {
  ROLE_ID: string;
  PROGRAMS: RoleProgramPermission[];
  BUTTON_GROUPS: RoleButtonGroupPermission[];
}

export interface RolePermissionSave {
  PROGRAMS: RoleProgramPermission[];
  BUTTON_GROUPS: RoleButtonGroupPermission[];
}

interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
}

interface ErrorResponse {
  MESSAGE?: string;
  FIELD_ERRORS?: Array<{ FIELD_NAME: string; MESSAGE: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/roles${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    const fieldMessage = error.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ');
    throw new Error(fieldMessage || error.MESSAGE || 'Role 요청을 처리하지 못했습니다.');
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

export const roleApi = {
  find: (keyword = '', useYn = '') =>
    request<Role[]>(queryString({ KEYWORD: keyword, USE_YN: useYn })),
  create: (role: RoleSave) =>
    request<Role>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(role) }),
  update: (role: RoleSave) =>
    request<Role>(`/${encodeURIComponent(role.ROLE_ID)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(role) }),
  delete: (roleId: string) =>
    request<void>(`/${encodeURIComponent(roleId)}`, { method: 'DELETE' }),
  permissions: (roleId: string) =>
    request<RolePermission>(`/${encodeURIComponent(roleId)}/permissions`),
  savePermissions: (roleId: string, body: RolePermissionSave) =>
    request<RolePermission>(`/${encodeURIComponent(roleId)}/permissions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
};