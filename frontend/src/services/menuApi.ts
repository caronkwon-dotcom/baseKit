import { MENU_RUNTIME_CHANGED_EVENT } from './menuRuntimeApi';

interface ApiResponse<T> { SUCCESS: boolean; DATA: T }
interface ErrorResponse { MESSAGE?: string; FIELD_ERRORS?: Array<{ FIELD_NAME: string; MESSAGE: string }> }

export interface MenuRecord {
  MENU_KEY: string;
  MENU_NAME: string;
  PARENT_MENU_KEY: string | null;
  MENU_TYPE_CODE: 'FOLDER' | 'PAGE' | string;
  SORT_ORDER: number;
  PROGRAM_KEY: string | null;
  USE_YN: 'Y' | 'N';
}

export interface MenuSave {
  MENU_KEY: string;
  MENU_NAME: string;
  PARENT_MENU_KEY: string | null;
  MENU_TYPE_CODE: string;
  SORT_ORDER: number;
  PROGRAM_KEY: string | null;
  USE_YN: 'Y' | 'N';
}

function query(values: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.size > 0 ? `?${params.toString()}` : '';
}

async function request<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/menus${path}`, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ErrorResponse;
    throw new Error(
      error.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ')
      || error.MESSAGE
      || '메뉴 요청을 처리하지 못했습니다.',
    );
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as ApiResponse<T>;
  return payload.DATA;
}

export const menuApi = {
  find: (values: Record<string, string>) => request<MenuRecord[]>(query(values)),
  get: (menuKey: string) => request<MenuRecord>(`/${encodeURIComponent(menuKey)}`),
  create: async (value: MenuSave) => {
    const created = await request<MenuRecord>('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(MENU_RUNTIME_CHANGED_EVENT));
    return created;
  },
  update: async (menuKey: string, value: MenuSave) => {
    const updated = await request<MenuRecord>(`/${encodeURIComponent(menuKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(MENU_RUNTIME_CHANGED_EVENT));
    return updated;
  },
  delete: async (menuKey: string) => {
    await request<void>(`/${encodeURIComponent(menuKey)}`, { method: 'DELETE' });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(MENU_RUNTIME_CHANGED_EVENT));
  },
};

