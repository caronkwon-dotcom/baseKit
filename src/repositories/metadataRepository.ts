import actionsJson from '../../meta/actions.json';
import menusJson from '../../meta/menus.json';
import programsJson from '../../meta/programs.json';
import roleProgramActionsJson from '../../meta/role-program-actions.json';
import { COMMON_ACTIONS, type ActionCode } from '../constants/actionCodes';
import { PROGRAM_KEYS } from '../types/adminShell';
import type {
  ActionMeta,
  MenuMeta,
  MenuNode,
  ProgramKey,
  ProgramMeta,
  RoleProgramAction,
} from '../types/adminShell';

const programs = programsJson as ProgramMeta[];
const menus = menusJson as MenuMeta[];
const actions = actionsJson as ActionMeta[];
const roleProgramActions = roleProgramActionsJson as RoleProgramAction[];

function assertUnique(values: string[], label: string) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${label} 중복: ${[...new Set(duplicates)].join(', ')}`);
  }
}

function validateMetadata() {
  assertUnique(programs.map((program) => program.programKey), 'PROGRAM_KEY');
  assertUnique(menus.map((menu) => menu.menuKey), 'MENU_KEY');
  assertUnique(actions.map((action) => action.actionCode), 'ACTION_CODE');

  const programKeys = new Set(programs.map((program) => program.programKey));
  const supportedProgramKeys = new Set<string>(PROGRAM_KEYS);
  const menuByKey = new Map(menus.map((menu) => [menu.menuKey, menu]));
  const actionCodes = new Set(actions.map((action) => action.actionCode));

  programs.forEach((program) => {
    if (!supportedProgramKeys.has(program.programKey)) {
      throw new Error(`지원하지 않는 PROGRAM_KEY: ${program.programKey}`);
    }
    program.actionCodes.forEach((actionCode) => {
      if (!actionCodes.has(actionCode)) {
        throw new Error(`${program.programKey}에 정의되지 않은 ACTION_CODE: ${actionCode}`);
      }
    });
  });

  PROGRAM_KEYS.forEach((programKey) => {
    if (!programKeys.has(programKey)) {
      throw new Error(`메타데이터에 PROGRAM_KEY가 없습니다: ${programKey}`);
    }
  });

  menus.forEach((menu) => {
    if (menu.menuLevel < 1 || menu.menuLevel > 3) {
      throw new Error(`${menu.menuKey}의 menuLevel은 1~3만 허용됩니다.`);
    }

    if (menu.parentMenuKey === null) {
      if (menu.menuLevel !== 1) {
        throw new Error(`${menu.menuKey}의 루트 메뉴 level은 1이어야 합니다.`);
      }
    } else {
      const parent = menuByKey.get(menu.parentMenuKey);
      if (!parent) {
        throw new Error(`${menu.menuKey}의 상위 메뉴가 없습니다: ${menu.parentMenuKey}`);
      }
      if (menu.menuLevel !== parent.menuLevel + 1) {
        throw new Error(`${menu.menuKey}의 menuLevel이 상위 메뉴와 일치하지 않습니다.`);
      }
    }

    if (menu.menuType === 'SCREEN' && !menu.programKey) {
      throw new Error(`${menu.menuKey} SCREEN 메뉴에는 PROGRAM_KEY가 필요합니다.`);
    }
    if (menu.programKey && !programKeys.has(menu.programKey)) {
      throw new Error(`${menu.menuKey}에 연결된 PROGRAM_KEY가 없습니다: ${menu.programKey}`);
    }
  });

  roleProgramActions.forEach((permission) => {
    const program = programs.find(
      (candidate) => candidate.programKey === permission.PROGRAM_KEY,
    );
    if (!program) {
      throw new Error(`권한에 정의되지 않은 PROGRAM_KEY: ${permission.PROGRAM_KEY}`);
    }
    if (!program.actionCodes.includes(permission.ACTION_CODE)) {
      throw new Error(
        `${permission.PROGRAM_KEY}에서 지원하지 않는 ACTION_CODE 권한: ${permission.ACTION_CODE}`,
      );
    }
  });
}

function buildMenuTree(menuItems: MenuMeta[]): MenuNode[] {
  const nodes = new Map(
    menuItems
      .filter((menu) => menu.useYn === 'Y')
      .map((menu) => [menu.menuKey, { ...menu, children: [] } as MenuNode]),
  );
  const roots: MenuNode[] = [];

  nodes.forEach((node) => {
    const parent = node.parentMenuKey ? nodes.get(node.parentMenuKey) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sort = (items: MenuNode[]) => {
    items.sort((left, right) => left.sortOrder - right.sortOrder);
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

validateMetadata();

export const metadataRepository = {
  getPrograms: () => programs.filter((program) => program.useYn === 'Y'),
  getMenus: () => menus.filter((menu) => menu.useYn === 'Y'),
  getMenuTree: () => buildMenuTree(menus),
  getActions: () => actions,
  getMenuNameByProgram: (programKey: ProgramKey) =>
    menus.find(
      (menu) => menu.useYn === 'Y' && menu.menuType === 'SCREEN' && menu.programKey === programKey,
    )?.menuName,
  getRoleProgramActions: () => roleProgramActions,
  hasAction: (
    roleCode: string,
    programKey: ProgramKey,
    actionCode: ActionCode,
  ) =>
    roleProgramActions.some(
      (permission) =>
        permission.ROLE_CODE === roleCode &&
        permission.PROGRAM_KEY === programKey &&
        permission.ACTION_CODE === actionCode &&
        permission.ALLOW_YN === 'Y',
    ),
};

export const programByKey = Object.fromEntries(
  metadataRepository
    .getPrograms()
    .map((program) => [program.programKey, program]),
) as Record<ProgramKey, ProgramMeta>;

export const hasAction = metadataRepository.hasAction;

export { COMMON_ACTIONS };
