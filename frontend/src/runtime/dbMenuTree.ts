import type { MenuNode, ProgramMeta, ProgramComponentMap } from '../types/adminShell';
import type { RuntimeMenuItem, RuntimeMenuProgramIssue } from '../services/menuRuntimeApi';

export interface InvalidRuntimeMenu {
  MENU_KEY: string;
  PROGRAM_KEY: string | null;
  REASON_CODE: string;
}

export interface ConvertedMenuTree {
  menuTree: MenuNode[];
  invalidProgramMenus: InvalidRuntimeMenu[];
}

export function convertDbMenuTree(
  items: RuntimeMenuItem[],
  backendIssues: RuntimeMenuProgramIssue[],
  programByKey: Record<string, ProgramMeta | undefined>,
  programComponents: ProgramComponentMap,
): ConvertedMenuTree {
  const invalidProgramMenus: InvalidRuntimeMenu[] = [...backendIssues];

  const convert = (item: RuntimeMenuItem, expectedParent: string | null, expectedLevel: number): MenuNode | null => {
    if (!item || typeof item.MENU_KEY !== 'string' || !item.MENU_KEY
      || typeof item.MENU_NAME !== 'string'
      || item.PARENT_MENU_KEY !== expectedParent
      || !Number.isInteger(item.SORT_ORDER)
      || item.MENU_LEVEL !== expectedLevel
      || !Array.isArray(item.CHILDREN)) {
      throw new Error('The DB menu tree has an invalid hierarchy or required field.');
    }
    if (item.MENU_TYPE_CODE !== 'FOLDER' && item.MENU_TYPE_CODE !== 'PAGE') {
      throw new Error(`Unsupported DB menu type: ${item.MENU_KEY}`);
    }

    if (item.MENU_TYPE_CODE === 'PAGE' && item.CHILDREN.length > 0) {
      throw new Error(`PAGE menu cannot contain child menus: ${item.MENU_KEY}`);
    }

    const children = item.CHILDREN
      .map(child => convert(child, item.MENU_KEY, expectedLevel + 1))
      .filter((child): child is MenuNode => child !== null)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.menuKey.localeCompare(right.menuKey));

    if (item.MENU_TYPE_CODE === 'FOLDER') {
      if (item.PROGRAM_KEY !== null) {
        throw new Error(`Folder menu cannot be linked to a Program: ${item.MENU_KEY}`);
      }
      return {
        menuKey: item.MENU_KEY,
        parentMenuKey: item.PARENT_MENU_KEY,
        menuName: item.MENU_NAME,
        menuLevel: item.MENU_LEVEL,
        menuType: 'FOLDER',
        programKey: null,
        sortOrder: item.SORT_ORDER,
        useYn: 'Y',
        children,
      };
    }

    const programKey = item.PROGRAM_KEY;
    if (!programKey) {
      invalidProgramMenus.push({ MENU_KEY: item.MENU_KEY, PROGRAM_KEY: null, REASON_CODE: 'PROGRAM_NOT_REGISTERED' });
      return null;
    }
    const program = programByKey[programKey];
    if (!program || program.useYn !== 'Y' || !programComponents[programKey]) {
      invalidProgramMenus.push({ MENU_KEY: item.MENU_KEY, PROGRAM_KEY: programKey, REASON_CODE: 'PROGRAM_NOT_IN_FRONTEND_REGISTRY' });
      return null;
    }

    return {
      menuKey: item.MENU_KEY,
      parentMenuKey: item.PARENT_MENU_KEY,
      menuName: item.MENU_NAME,
      menuLevel: item.MENU_LEVEL,
      menuType: 'PAGE',
      programKey,
      sortOrder: item.SORT_ORDER,
      useYn: 'Y',
      children: [],
    };
  };

  const menuTree = items
    .map(item => convert(item, null, 1))
    .filter((item): item is MenuNode => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.menuKey.localeCompare(right.menuKey));

  return { menuTree, invalidProgramMenus };
}
