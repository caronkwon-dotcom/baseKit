import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(path, loadSettings) {
 const states=[], effects=[];
 let index=0;
 const exports={};
 const tree=[{menuKey:'SD',menuName:'SD',children:[{programKey:'P',children:[]}]}];
 const source=ts.transpileModule(readFileSync(new URL('../src/layouts/standalone/StandaloneShell.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const require=id=>{
  if(id==='react') return {useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),useState(initial){const slot=index++;if(!(slot in states))states[slot]=initial;return [states[slot],v=>{states[slot]=typeof v==='function'?v(states[slot]):v;}];}};
  if(id==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(id==='react-router-dom') return {useLocation:()=>({pathname:path}),useNavigate:()=>()=>{}};
  if(id.includes('programRegistry')) return {programComponents:{P:()=>({screen:'menu-builder'})}};
  if(id.includes('metadataRepository')) return {metadataRepository:{getMenuTree:()=>tree},programByKey:{P:{useYn:'Y',programName:'메뉴 설계'}}};
  if(id.includes('menuExecutionApi')) return {listMenuExecutionSettings:loadSettings};
  if(id.includes('designLifecycle.repository')) return {designLifecycleRepository:{getSelectedProjectId:()=>''}};
  return {};
 };
 vm.runInNewContext(source,{exports,require,decodeURIComponent,fetch(){throw new Error('Shell must never request access confirmation');},window:{addEventListener:()=>{},removeEventListener:()=>{}}});
 return {effects,render(){index=0;effects.length=0;return exports.default();}};
}

test('registered Window renders immediately while settings are pending and after server failure',async()=>{
 let reject;
 const h=harness('/window/SD/P',()=>new Promise((_,r)=>{reject=r;}));
 let page=h.render();
 assert.equal(page.type,'div');
 assert.equal(page.props.children[2].props.children.screen,'menu-builder');
 h.effects.forEach(fn=>fn());
 reject(new Error('old server or offline'));
 await new Promise(resolve=>setImmediate(resolve));
 page=h.render();
 assert.equal(page.props.className,'standalone-shell standalone-shell--basekit');
 assert.equal(page.props.children[2].props.children.screen,'menu-builder');
});

test('saved LINEAR presentation is retained without access confirmation',async()=>{
 const h=harness('/window/SD/P',async()=>[{MENU_ID:'SD',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'}]);
 h.render();h.effects.forEach(fn=>fn());
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.render().props.className,'standalone-shell standalone-shell--linear');
});

test('unknown module, foreign program and malformed Window routes remain invalid',()=>{
 for(const path of ['/window/OTHER/P','/window/SD/FORGED','/window/SD/P/extra']){
  const page=harness(path,async()=>[]).render();
  assert.equal(page.props.role,'alert');
  assert.equal(page.props.children,'등록되지 않은 독립 창 주소입니다.');
 }
});
