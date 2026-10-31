import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(load,save=async value=>value) {
 const states=[], effects=[]; let index=0;
 const root={MENU_KEY:'SYS',MENU_NAME:'System',MENU_TYPE_CODE:'GROUP',PARENT_MENU_KEY:null,USE_YN:'Y'};
 const child={MENU_KEY:'SYS.MENU',MENU_NAME:'Menus',MENU_TYPE_CODE:'PAGE',PARENT_MENU_KEY:'SYS',PROGRAM_KEY:'MENU_MGMT',USE_YN:'Y'};
 const react={useState(initial){const slot=index++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];},useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)};
 const component=()=>null;const exports={};
 const source=ts.transpileModule(readFileSync(new URL('../src/pages/MenuManagePage.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const require=id=>id==='react'?react:id==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:id.includes('menuApi')?{menuApi:{find:async()=>[root,child]}}:id.includes('programApi')?{programApi:{find:async()=>[]}}:id.includes('menuExecutionApi')?{listMenuExecutionSettings:load,saveMenuExecutionSetting:save}:{__esModule:true,default:component};
 vm.runInNewContext(source,{exports,require,Error,Event:class{},window:{dispatchEvent:()=>true}});
 const render=()=>{index=0;effects.length=0;return exports.default();};
 const nodes=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];
 return {root,child,states,effects,render,nodes,table:page=>page.props.children[1]};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('menu row selection survives denied settings while editing stays locked',async()=>{
 const h=harness(async()=>{throw new Error('permission denied');}); let page=h.render();h.effects[0]();await tick();page=h.render();
 assert.equal(typeof h.table(page).props.onRowClick,'function');h.table(page).props.onRowClick(h.root);page=h.render();
 assert.equal(h.states[2].MENU_KEY,'SYS');assert.equal(h.nodes(page).find(n=>n.type==='fieldset').props.disabled,true);assert.equal(h.states[9],'permission denied');
});
test('DB menu rows become selectable after loading and child inherits saved settings read-only',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));let page=h.render();h.effects[0]();assert.equal(h.table(page).props.rows.length,0);
 resolve([{MENU_ID:'SYS',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'}]);await tick();page=h.render();assert.equal(h.table(page).props.rows.length,2);h.table(page).props.onRowClick(h.root);page=h.render();
 assert.equal(h.states[5].DESIGN_TYPE,'LINEAR');assert.equal(h.nodes(page).find(n=>n.type==='fieldset').props.disabled,false);
 h.table(page).props.onRowClick(h.child);page=h.render();assert.equal(h.states[5].MENU_ID,'SYS');assert.equal(h.nodes(page).find(n=>n.type==='fieldset').props.disabled,true);
});
test('save rejection keeps the selected draft and reports failure',async()=>{
 const h=harness(async()=>[],async()=>{throw new Error('save denied');});let page=h.render();h.effects[0]();await tick();page=h.render();h.table(page).props.onRowClick(h.root);page=h.render();
 await h.nodes(page).find(n=>n.type==='button').props.onClick();await tick();assert.equal(h.states[2].MENU_KEY,'SYS');assert.equal(h.states[7],false);assert.equal(h.states[9],'save denied');
});
