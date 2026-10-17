import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMenuExecution, standaloneWindowUrl, standaloneWindowName, launchStandaloneWindow } from '../src/runtime/menuExecution.ts';
const node = (menuKey, programKey=null, children=[]) => ({ menuKey, programKey, children, useYn:'Y', parentMenuKey:null, menuName:menuKey, menuLevel:1, menuType: programKey?'SCREEN':'GROUP', sortOrder:0 });
const tree = [node('SD',null,[node('child',null,[node('screen','P')])]),node('COMMON', 'C')];
test('nested program inherits exact root setting, child settings cannot override it', () => {
 const result=resolveMenuExecution(tree,'P',[{MENU_ID:'SD',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'},{MENU_ID:'child',EXECUTION_TYPE:'INNER',DESIGN_TYPE:'BASEKIT'}]);
 assert.deepEqual(result,{MENU_ID:'SD',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'});
});
test('unset menus default INNER BASEKIT without changing metadata', () => {
 const snapshot=JSON.stringify(tree);
 assert.deepEqual(resolveMenuExecution(tree,'C',[]),{MENU_ID:'COMMON',EXECUTION_TYPE:'INNER',DESIGN_TYPE:'BASEKIT'});
 assert.equal(JSON.stringify(tree),snapshot);
 assert.equal(resolveMenuExecution(tree,'missing',[]),undefined);
});
test('menu keys are exact and disabled branches never resolve', () => {
 assert.equal(resolveMenuExecution(tree,'P',[{MENU_ID:'sd',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'}]).EXECUTION_TYPE,'INNER');
 assert.equal(resolveMenuExecution([{...tree[0],useYn:'N'}],'P',[]),undefined);
});
test('window URL preserves hosting base and encodes arbitrary root and program IDs', () => {
 assert.equal(standaloneWindowUrl('https://example.com/baseKit/#/old','모듈 /?#','P /?#'),'https://example.com/baseKit/#/window/%EB%AA%A8%EB%93%88%20%2F%3F%23/P%20%2F%3F%23');
 assert.notEqual(standaloneWindowName('a-b'),standaloneWindowName('a_b'));
});
test('reuses fixed module name across programs and reports popup rejection', () => {
 const calls=[];
 const browser={location:{href:'https://example.com/baseKit/#/'},open:(...args)=>{calls.push(args);return {focus(){}};}};
 assert.equal(launchStandaloneWindow('SD','P',browser),true);
 assert.equal(launchStandaloneWindow('SD','Q',browser),true);
 assert.equal(calls[0][1],calls[1][1]);
 assert.notEqual(calls[0][0],calls[1][0]);
 assert.equal(launchStandaloneWindow('SD','P',{...browser,open:()=>null}),false);
});

test('window policy exceptions report a blocked launch', () => {
 assert.equal(launchStandaloneWindow('SD','P',{location:{href:'https://example.com/'},open(){throw new Error('blocked');}}),false);
});

import { listMenuExecutionSettings } from '../src/services/menuExecutionApi.ts';

test('settings failures reject safely and leave legacy INNER defaults usable', async (t) => {
 for (const status of [403, 404, 500, 503]) {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({MESSAGE:'unavailable'}), {status}));
  await assert.rejects(listMenuExecutionSettings);
  assert.equal(resolveMenuExecution(tree,'P',[]).EXECUTION_TYPE,'INNER');
  t.mock.restoreAll();
 }
 t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('ECONNREFUSED'); });
 await assert.rejects(listMenuExecutionSettings);
 assert.equal(resolveMenuExecution(tree,'C',[]).DESIGN_TYPE,'BASEKIT');
});

test('malformed successful responses cannot enable WINDOW or break menu resolution', async (t) => {
 for (const payload of [{}, {DATA:null}, {DATA:{}}, {DATA:[null]}, {DATA:[{MENU_ID:'SD',EXECUTION_TYPE:'WINDOW'}]}]) {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(payload)));
  await assert.rejects(listMenuExecutionSettings);
  t.mock.restoreAll();
 }
});

test('empty response defaults INNER, explicit WINDOW remains scoped to its root', async (t) => {
 t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({DATA:[]})));
 assert.equal(resolveMenuExecution(tree,'P',await listMenuExecutionSettings()).EXECUTION_TYPE,'INNER');
 t.mock.restoreAll();
 t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({DATA:[{MENU_ID:'SD',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'}]})));
 const settings=await listMenuExecutionSettings();
 assert.equal(resolveMenuExecution(tree,'P',settings).EXECUTION_TYPE,'WINDOW');
 assert.equal(resolveMenuExecution(tree,'C',settings).EXECUTION_TYPE,'INNER');
});
