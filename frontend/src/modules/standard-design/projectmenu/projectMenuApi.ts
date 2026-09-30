export type ProjectMenuMode = 'LEVEL' | 'SINGLE';
export interface ProjectMenu {
  PROJECT_MENU_ID: string;
  PROJECT_ID: string;
  MENU_ID: string;
  MENU_NAME: string;
  MENU_LEVEL: number | null;
  LEVEL1_MENU_ID: string | null;
  SORT_ORDER: number;
  REG_DT?: string;
  MOD_DT?: string;
}
export interface ProjectMenuPage { PROJECT_ID: string; MENU_MANAGEMENT_MODE: ProjectMenuMode; ITEMS: ProjectMenu[] }
export interface ProjectMenuInput { PROJECT_ID: string; MENU_ID: string; MENU_NAME: string; MENU_LEVEL: number | null; LEVEL1_MENU_ID: string | null; SORT_ORDER?: number }
const base = '/api/standard-design/project-menus';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { MESSAGE?: string; FIELD_ERRORS?: { FIELD_NAME: string; MESSAGE: string }[] };
    throw new Error(error.FIELD_ERRORS?.map((field) => `${field.FIELD_NAME}: ${field.MESSAGE}`).join(', ') || error.MESSAGE || '프로젝트 메뉴 요청을 처리하지 못했습니다.');
  }
  if (response.status === 204) return undefined as T;
  return (await response.json() as { DATA: T }).DATA;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const projectMenuApi = {
  list: (projectId: string) => request<ProjectMenuPage>(`?PROJECT_ID=${encodeURIComponent(projectId)}`),
  setMode: (projectId: string, mode: ProjectMenuMode) => request<ProjectMenuPage>('/mode', json('PUT', { PROJECT_ID: projectId, MENU_MANAGEMENT_MODE: mode })),
  create: (body: ProjectMenuInput) => request<ProjectMenu>('', json('POST', body)),
  update: (id: string, body: ProjectMenuInput) => request<ProjectMenu>(`/${encodeURIComponent(id)}`, json('PUT', body)),
  delete: (id: string) => request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
