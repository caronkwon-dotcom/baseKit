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
export async function listMenuExecutionSettings(): Promise<MenuExecutionSetting[]> {
  const settings = await request<MenuExecutionSetting[]>();
  if (!Array.isArray(settings) || !settings.every(setting => setting &&
    typeof setting.MENU_ID === 'string' &&
    ['INNER', 'WINDOW'].includes(setting.EXECUTION_TYPE) &&
    ['BASEKIT', 'LINEAR'].includes(setting.DESIGN_TYPE))) {
    throw new Error('메뉴 실행 설정 응답 형식이 올바르지 않습니다.');
  }
  return settings;
}
export function saveMenuExecutionSetting(setting: MenuExecutionSetting): Promise<MenuExecutionSetting> {
  return request<MenuExecutionSetting>(`/${encodeURIComponent(setting.MENU_ID)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ EXECUTION_TYPE: setting.EXECUTION_TYPE, DESIGN_TYPE: setting.DESIGN_TYPE }),
  });
}
