import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMenus as sample, rows, moveMenu, auxiliaryTarget, parseDraft } from '../src/modules/standard-design/menu-builder/menuBuilder.ts';
const depth = (n, id) => rows(n).find(r => r.node.MENU_ID === id).depth;
test('same-parent ordering moves full subtree without losing data', () => {
 const result = moveMenu(sample, 'orders', 'dashboard', 'before').nodes;
 assert.deepEqual(rows(result).slice(0, 5).map(r => r.node.MENU_ID), ['sales', 'orders', 'order-list', 'order-create', 'dashboard']);
 assert.deepEqual(result.find(n => n.MENU_ID === 'orders').REQUIREMENTS, sample.find(n => n.MENU_ID === 'orders').REQUIREMENTS);
 assert.equal(sample[1].MENU_ID, 'dashboard');
});
test('reparenting brings children and updates descendant depths', () => {
 const result = moveMenu(sample, 'orders', 'inventory', 'inside').nodes;
 assert.equal(result.find(n => n.MENU_ID === 'orders').PARENT_ID, 'inventory');
 assert.equal(depth(result, 'order-list'), 3);
 assert.equal(result.length, sample.length);
 const root = moveMenu(result, 'orders', 'inventory', 'after').nodes;
 assert.equal(depth(root, 'orders'), 1);
 assert.equal(depth(root, 'order-list'), 2);
});
test('rejects self, descendant and fourth depth including nested children', () => {
 for (const [id,target] of [['sales','sales'], ['sales','order-list'], ['orders','dashboard'], ['stock','order-list']]) {
  const result = moveMenu(sample,id,target,'inside');
  assert.ok(result.error); assert.equal(result.nodes,sample);
 }
});
test('auxiliary movement covers all four directions and boundary', () => {
 assert.deepEqual(auxiliaryTarget(sample,'orders','up'), {id:'dashboard',position:'before'});
 assert.deepEqual(auxiliaryTarget(sample,'orders','down'), {id:'customers',position:'after'});
 assert.deepEqual(auxiliaryTarget(sample,'orders','outdent'), {id:'sales',position:'after'});
 assert.deepEqual(auxiliaryTarget(sample,'orders','indent'), {id:'dashboard',position:'inside'});
 assert.equal(auxiliaryTarget(sample,'sales','up'),null);
});
test('browser draft validates schema, duplicates, cycles, missing parents, max depth', () => {
 assert.deepEqual(parseDraft(JSON.stringify(sample)),sample);
 for (const bad of [[], [{...sample[0], PARENT_ID:'missing'}], [sample[0],sample[0]], [{...sample[0],PARENT_ID:'sales'}], sample.map(n=>n.MENU_ID==='stock'?{...n,PARENT_ID:'order-list'}:n)]) assert.throws(()=>parseDraft(JSON.stringify(bad)));
});
test('300-menu tree retains all nodes through a cross-root move', () => {
 const many = Array.from({length:300},(_,i)=>({...sample[0],MENU_ID:`n${i}`,PARENT_ID:i%10 ? `n${i-i%10}`:null}));
 const next = moveMenu(many,'n0','n10','inside');
 assert.equal(next.error,undefined); assert.equal(rows(next.nodes).length,300); assert.equal(depth(next.nodes,'n1'),3);
});
