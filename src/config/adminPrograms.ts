import type { MenuMeta, MenuNode, ProgramMeta, ProgramKey } from '../types/adminShell';

/**
 * 관리자 프로그램/메뉴 설정
 *
 * programs는 Workspace에 표시 가능한 프로그램 화면 목록이다.
 * menus는 Sidebar에 표시할 메뉴 목록이다.
 * menu.programKey와 program.programKey를 기준으로 메뉴와 화면을 연결한다.
 *
 * 현재는 React 샘플 단계이므로 코드 상수로 관리하며,
 * 추후 Spring API 연동 시 프로그램/메뉴 설정 조회 결과로 대체할 수 있다.
 */
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
  {
    programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
    programName: '기본 검색 페이지 샘플 Type 1',
    componentName: 'SearchSampleType1Page',
    screenType: 'GRID_DETAIL',
    routePath: '/dev-guide/search-sample-type-1',
    actions: ['SEARCH'],
    manualActions: ['MANUAL_VIEW'],
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
  {
    menuKey: 'DEV_GUIDE',
    parentMenuKey: null,
    menuName: '개발자가이드',
    menuLevel: 1,
    menuType: 'GROUP',
    programKey: null,
    sortOrder: 99,
    useYn: 'Y',
  },
  {
    menuKey: 'DEV_GUIDE.SEARCH_SAMPLE_TYPE_1',
    parentMenuKey: 'DEV_GUIDE',
    menuName: '기본 검색 페이지 샘플',
    menuLevel: 2,
    menuType: 'SCREEN',
    programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
    sortOrder: 1,
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
