import type { MenuMeta, MenuNode, ProgramMeta, ProgramKey } from '../types/adminShell';

export const programs: ProgramMeta[] = [
  {
    programKey: 'HOME',
    programName: '홈',
    componentName: 'HomePage',
    screenType: 'HOME',
    routePath: '/',
    actions: [],
    manualActions: ['MANUAL_VIEW'],
  },
  {
    programKey: 'USER_MGMT',
    programName: '사용자관리',
    componentName: 'UserManagePage',
    screenType: 'GRID_DETAIL',
    routePath: '/system/users',
    actions: ['SEARCH', 'CREATE', 'UPDATE', 'DELETE'],
    manualActions: ['MANUAL_VIEW', 'MANUAL_GENERATE', 'MANUAL_EDIT'],
  },
  {
    programKey: 'COMMON_CODE_MGMT',
    programName: '공통코드관리',
    componentName: 'CodeManagePage',
    screenType: 'GRID_DETAIL',
    routePath: '/system/codes',
    actions: ['SEARCH'],
    manualActions: ['MANUAL_VIEW', 'MANUAL_GENERATE'],
  },
  {
    programKey: 'MENU_MGMT',
    programName: '메뉴관리',
    componentName: 'MenuManagePage',
    screenType: 'GRID_DETAIL',
    routePath: '/system/menus',
    actions: ['SEARCH'],
    manualActions: ['MANUAL_VIEW', 'MANUAL_GENERATE'],
  },
];

export const menus: MenuMeta[] = [
  {
    menuKey: 'SYS',
    parentMenuKey: null,
    menuName: '시스템관리',
    menuLevel: 1,
    menuType: 'GROUP',
    programKey: null,
    sortOrder: 1,
    useYn: 'Y',
  },
  {
    menuKey: 'SYS.USER',
    parentMenuKey: 'SYS',
    menuName: '사용자관리',
    menuLevel: 2,
    menuType: 'SCREEN',
    programKey: 'USER_MGMT',
    sortOrder: 1,
    useYn: 'Y',
  },
  {
    menuKey: 'SYS.CODE',
    parentMenuKey: 'SYS',
    menuName: '공통코드관리',
    menuLevel: 2,
    menuType: 'SCREEN',
    programKey: 'COMMON_CODE_MGMT',
    sortOrder: 2,
    useYn: 'Y',
  },
  {
    menuKey: 'SYS.MENU',
    parentMenuKey: 'SYS',
    menuName: '메뉴관리',
    menuLevel: 2,
    menuType: 'SCREEN',
    programKey: 'MENU_MGMT',
    sortOrder: 3,
    useYn: 'Y',
  },
];

export const programByKey = programs.reduce(
  (acc, program) => {
    acc[program.programKey] = program;
    return acc;
  },
  {} as Record<ProgramKey, ProgramMeta>,
);

export function buildMenuTree(menuItems: MenuMeta[]): MenuNode[] {
  const nodeByKey = new Map<string, MenuNode>();

  menuItems
    .filter((menu) => menu.useYn === 'Y')
    .forEach((menu) => {
      nodeByKey.set(menu.menuKey, { ...menu, children: [] });
    });

  const roots: MenuNode[] = [];

  nodeByKey.forEach((node) => {
    if (node.parentMenuKey && nodeByKey.has(node.parentMenuKey)) {
      nodeByKey.get(node.parentMenuKey)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortMenus = (nodes: MenuNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortMenus(node.children));
  };

  sortMenus(roots);

  return roots;
}
