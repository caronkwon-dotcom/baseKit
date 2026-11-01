export const MENU_RUNTIME_CHANGED_EVENT = 'basekit:menu-runtime-changed';

export interface RuntimeMenuItem {
  MENU_KEY: string;
  MENU_NAME: string;
  PARENT_MENU_KEY: string | null;
  MENU_TYPE_CODE: 'FOLDER' | 'PAGE';
  SORT_ORDER: number;
  PROGRAM_KEY: string | null;
  MENU_LEVEL: number;
  CHILDREN: RuntimeMenuItem[];
}

export interface RuntimeMenuProgramIssue {
  MENU_KEY: string;
  PROGRAM_KEY: string | null;
  REASON_CODE: string;
}

export interface RuntimeMenuResponse {
  MENUS: RuntimeMenuItem[];
  INVALID_PROGRAM_MENUS: RuntimeMenuProgramIssue[];
}

interface ApiResponse<T> {
  SUCCESS: boolean;
  DATA: T;
  MESSAGE?: string;
}

export async function fetchRuntimeMenus(fetcher: typeof fetch = fetch): Promise<RuntimeMenuResponse> {
  const response = await fetcher('/api/core/menus/runtime', { credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({})) as ApiResponse<RuntimeMenuResponse>;
  if (!response.ok || payload.SUCCESS !== true) {
    throw new Error(payload.MESSAGE || 'Could not load DB menus. Check the server connection.');
  }
  if (!payload.DATA || !Array.isArray(payload.DATA.MENUS)
    || !Array.isArray(payload.DATA.INVALID_PROGRAM_MENUS)) {
    throw new Error('The DB menu response has an invalid format.');
  }
  return payload.DATA;
}
