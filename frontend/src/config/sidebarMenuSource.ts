export type SidebarMenuSource = 'STATIC' | 'DB';

export function resolveSidebarMenuSource(value: string | undefined): SidebarMenuSource {
  return value?.trim().toUpperCase() === 'DB' ? 'DB' : 'STATIC';
}

const configuredSource = typeof import.meta.env === 'undefined'
  ? undefined
  : import.meta.env.VITE_SIDEBAR_MENU_SOURCE;

export const SIDEBAR_MENU_SOURCE = resolveSidebarMenuSource(configuredSource);
