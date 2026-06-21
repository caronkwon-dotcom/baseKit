import type { Menu, MenuTreeNode } from '../types/menu';

export function buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const sortedMenus = menus
    .filter((menu) => menu.useYn === 'Y')
    .toSorted(
      (a, b) => a.menuLevel - b.menuLevel || a.orderNo - b.orderNo,
    );

  const nodeMap = new Map<string, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  sortedMenus.forEach((menu) => {
    nodeMap.set(menu.menuId, {
      ...menu,
      children: [],
    });
  });

  sortedMenus.forEach((menu) => {
    const node = nodeMap.get(menu.menuId);

    if (!node) {
      return;
    }

    if (menu.parentMenuId === null) {
      roots.push(node);
      return;
    }

    const parentNode = nodeMap.get(menu.parentMenuId);

    if (parentNode) {
      parentNode.children.push(node);
    }
  });

  return roots;
}
