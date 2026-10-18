import type { MenuNode, ProgramKey } from '../types/adminShell';
import type { MenuExecutionSetting } from '../services/menuExecutionApi';

export function findRootMenu(menuTree: MenuNode[], programKey: ProgramKey, preferredRoot?: string): MenuNode | undefined {
  const containsProgram = (menu: MenuNode): boolean => menu.useYn === 'Y' &&
    (menu.programKey === programKey || menu.children.some(containsProgram));
  return menuTree.find(menu => menu.menuKey === preferredRoot && containsProgram(menu)) ?? menuTree.find(containsProgram);
}

/** Exact JSON/Manifest root menuKey is the ID; descendants inherit its setting. */
export function resolveMenuExecution(menuTree: MenuNode[], programKey: ProgramKey, settings: MenuExecutionSetting[], preferredRoot?: string): MenuExecutionSetting | undefined {
  const root = findRootMenu(menuTree, programKey, preferredRoot);
  if (!root) return undefined;
  return settings.find(setting => setting.MENU_ID === root.menuKey) ?? {
    MENU_ID: root.menuKey, EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT',
  };
}

export function standaloneWindowUrl(baseUrl: string, menuKey: string, programKey: ProgramKey): string {
  const url = new URL(baseUrl);
  url.hash = `/window/${encodeURIComponent(menuKey)}/${encodeURIComponent(programKey)}`;
  return url.href;
}

export function standaloneWindowName(menuKey: string): string {
  return `basekit_module_${Array.from(menuKey).map(char => char.codePointAt(0)!.toString(16)).join('_')}`;
}

export function launchStandaloneWindow(menuKey: string, programKey: ProgramKey, browser: Pick<Window, 'open' | 'location'> = window): boolean {
  let child: Window | null;
  try { child = browser.open(standaloneWindowUrl(browser.location.href, menuKey, programKey), standaloneWindowName(menuKey)); } catch { return false; }
  if (!child) return false;
  try { child.focus(); } catch { /* Host isolation can restrict the window reference. */ }
  return true;
}
