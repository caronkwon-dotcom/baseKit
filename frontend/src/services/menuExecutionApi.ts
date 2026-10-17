export interface MenuExecutionSetting {
  MENU_ID: string;
  EXECUTION_TYPE: 'INNER' | 'WINDOW';
  DESIGN_TYPE: 'BASEKIT' | 'LINEAR';
}
async function request<T>(path = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/menu-execution-settings${path}`, { credentials: 'same-origin', ...init });
  const payload = await response.json().catch(() => ({})) as { DATA: T; MESSAGE?: string };
  if (!response.ok) throw new Error(payload.MESSAGE || '메뉴 실행 설정을 처리하지 못했습니다.');
  return payload.DATA;
}
export function listMenuExecutionSettings(): Promise<MenuExecutionSetting[]> { return request<MenuExecutionSetting[]>(); }
export function saveMenuExecutionSetting(setting: MenuExecutionSetting): Promise<MenuExecutionSetting> {
  return request<MenuExecutionSetting>(`/${encodeURIComponent(setting.MENU_ID)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ EXECUTION_TYPE: setting.EXECUTION_TYPE, DESIGN_TYPE: setting.DESIGN_TYPE }),
  });
}
