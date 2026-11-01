import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSidebarMenuSource } from '../src/config/sidebarMenuSource.ts';
import { convertDbMenuTree } from '../src/runtime/dbMenuTree.ts';
import { resolveMenuExecution, standaloneWindowUrl } from '../src/runtime/menuExecution.ts';
import { fetchRuntimeMenus } from '../src/services/menuRuntimeApi.ts';

const programByKey = {
  PROGRAM_A: { programKey: 'PROGRAM_A', programName: 'Program A', useYn: 'Y' },
  PROGRAM_B: { programKey: 'PROGRAM_B', programName: 'Program B', useYn: 'Y' },
};
const programComponents = { PROGRAM_A: () => null, PROGRAM_B: () => null };

function menu(menuKey, parentMenuKey, level, sortOrder, type, programKey = null, children = []) {
  return {
    MENU_KEY: menuKey,
    MENU_NAME: menuKey,
    PARENT_MENU_KEY: parentMenuKey,
    MENU_TYPE_CODE: type,
    SORT_ORDER: sortOrder,
    PROGRAM_KEY: programKey,
    MENU_LEVEL: level,
    CHILDREN: children,
  };
}

test('static JSON/Manifest remains default and DB requires an explicit flag', () => {
  assert.equal(resolveSidebarMenuSource(undefined), 'STATIC');
  assert.equal(resolveSidebarMenuSource('static'), 'STATIC');
  assert.equal(resolveSidebarMenuSource(' db '), 'DB');
});

test('converts sorted 3Depth DB menus and preserves Program links', () => {
  const input = [
    menu('ROOT_B', null, 1, 20, 'PAGE', 'PROGRAM_B'),
    menu('ROOT_A', null, 1, 10, 'FOLDER', null, [
      menu('CHILD_B', 'ROOT_A', 2, 20, 'PAGE', 'PROGRAM_B'),
      menu('CHILD_A', 'ROOT_A', 2, 10, 'FOLDER', null, [
        menu('LEAF_A', 'CHILD_A', 3, 1, 'PAGE', 'PROGRAM_A'),
      ]),
    ]),
  ];

  const result = convertDbMenuTree(input, [], programByKey, programComponents);
  assert.deepEqual(result.menuTree.map(item => item.menuKey), ['ROOT_A', 'ROOT_B']);
  assert.deepEqual(result.menuTree[0].children.map(item => item.menuKey), ['CHILD_A', 'CHILD_B']);
  assert.equal(result.menuTree[0].children[0].children[0].programKey, 'PROGRAM_A');
  assert.equal(result.menuTree[0].children[0].children[0].menuLevel, 3);
});

test('omits DB menus whose Program is missing from the frontend registry', () => {
  const result = convertDbMenuTree(
    [menu('BAD_PAGE', null, 1, 1, 'PAGE', 'MISSING_PROGRAM')],
    [],
    programByKey,
    programComponents,
  );
  assert.deepEqual(result.menuTree, []);
  assert.equal(result.invalidProgramMenus[0].MENU_KEY, 'BAD_PAGE');
  assert.equal(result.invalidProgramMenus[0].REASON_CODE, 'PROGRAM_NOT_IN_FRONTEND_REGISTRY');
});

test('keeps zero DB menus empty rather than substituting static menus', () => {
  const response = { SUCCESS: true, DATA: { MENUS: [], INVALID_PROGRAM_MENUS: [] } };
  return fetchRuntimeMenus(async () => new Response(JSON.stringify(response), { status: 200 }))
    .then(data => assert.deepEqual(data.MENUS, []));
});

test('distinguishes a DB runtime request failure from a successful empty result', async () => {
  await assert.rejects(
    fetchRuntimeMenus(async () => new Response(JSON.stringify({ SUCCESS: false, MESSAGE: 'DB unavailable' }), { status: 503 })),
    /DB unavailable/,
  );
});

test('connects a DB-derived root to existing Standalone execution settings', () => {
  const dbTree = convertDbMenuTree(
    [menu('MODULE_ROOT', null, 1, 1, 'FOLDER', null, [menu('PAGE_A', 'MODULE_ROOT', 2, 1, 'PAGE', 'PROGRAM_A')])],
    [],
    programByKey,
    programComponents,
  ).menuTree;
  const execution = resolveMenuExecution(dbTree, 'PROGRAM_A', [
    { MENU_ID: 'MODULE_ROOT', EXECUTION_TYPE: 'WINDOW', DESIGN_TYPE: 'BASEKIT' },
  ]);
  assert.equal(execution.MENU_ID, 'MODULE_ROOT');
  assert.equal(execution.EXECUTION_TYPE, 'WINDOW');
  assert.equal(new URL(standaloneWindowUrl('https://basekit.test/', execution.MENU_ID, 'PROGRAM_A')).hash,
    '#/window/MODULE_ROOT/PROGRAM_A');
});
