import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveMenuExecution } from '../src/runtime/menuExecution.ts';

// Run the real layout callbacks with lightweight React/router/browser boundaries.
function layoutHarness(loadSettings) {
 const states=[], effects=[], listeners=new Map(), navigations=[], launches=[];
 let index=0;
 const component=(name)=>Object.assign(()=>null,{displayName:name});
 const programs={HOME:{programKey:'HOME',programName:'Home',routePath:'/'},P:{programKey:'P',programName:'Page',routePath:'/page',useYn:'Y'}};
 const tree=[{menuKey:'SYS',menuName:'System',useYn:'Y',children:[{menuKey:'child',programKey:'P',useYn:'Y',children:[]}]}];
 const react={useMemo:fn=>fn(),useState(initial){const slot=index++; if (!(slot in states)) states[slot]=typeof initial==='function'?initial():initial; return [states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];},useEffect:fn=>effects.push(fn)};
 const exports={};
 const source=ts.transpileModule(readFileSync(new URL('../src/layouts/AppLayout.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const require=(id)=>{
  if(id==='react') return react;
  if(id==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(id==='react-router-dom') return {useLocation:()=>({pathname:'/'}),useNavigate:()=>path=>navigations.push(path)};
  if(id.includes('menuExecutionApi')) return {listMenuExecutionSettings:loadSettings};
  if(id.includes('runtime/menuExecution')) return {resolveMenuExecution,launchStandaloneWindow:(...args)=>{launches.push(args);return true;}};
  if(id.includes('metadataRepository')) return {metadataRepository:{getMenuTree:()=>tree},programByKey:programs};
  if(id.includes('designLifecycle.repository')) return {designLifecycleRepository:{getSelectedProjectId:()=>null}};
  if(id.includes('programRegistry')) return {programComponents:{}};
  if(id.includes('ProjectContextSelector')) return {ProjectContextDialog:component('Dialog')};
  return {__esModule:true,default:component(id.split('/').at(-1))};
 };
 vm.runInNewContext(source,{exports,require,localStorage:{getItem:()=>null},CustomEvent:class {constructor(type,options){this.type=type;Object.assign(this,options);}},window:{addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:()=>{},dispatchEvent:()=>true}});
 const render=()=>{index=0;effects.length=0;return exports.default();};
 const header=node=>node.props.children.find(child=>child?.type?.displayName==='Header').props;
 return {render,header,effects,listeners,navigations,launches};
}

test('layout menu and linked-program callbacks work during loading and after settings rejection',async()=>{
 let reject;
 const h=layoutHarness(()=>new Promise((_,r)=>{reject=r;}));
 let page=h.render();
 h.effects.forEach(effect=>effect());
 h.header(page).onOpenProgram('P');
 assert.deepEqual(h.navigations,['/page']);
 reject(new Error('403 or backend unavailable'));
 await new Promise(resolve=>setImmediate(resolve));
 page=h.render(); h.effects.at(-1)();
 h.header(page).onSelectTopMenu('SYS');
 h.header(page).onOpenProgram('P');
 h.listeners.get('basekit:open-program')({detail:{PROGRAM_KEY:'P'}});
 assert.equal(h.navigations.length,3);
 assert.equal(h.launches.length,0);
});

test('layout retains a verified WINDOW setting while refresh is pending or fails',async()=>{
 let calls=0;
 const h=layoutHarness(async()=>{if(calls++===0)return [{MENU_ID:'SYS',EXECUTION_TYPE:'WINDOW',DESIGN_TYPE:'LINEAR'}];throw new Error('503');});
 h.render(); h.effects.forEach(effect=>effect());
 await new Promise(resolve=>setImmediate(resolve));
 let page=h.render();
 // Only register the linked-program effect: mounting/settings loader already ran.
 h.effects.at(-1)();
 h.listeners.get('basekit:menu-execution-settings-changed')();
 h.header(page).onOpenProgram('P');
 await new Promise(resolve=>setImmediate(resolve));
 page=h.render(); h.effects.at(-1)();
 h.header(page).onOpenProgram('P');
 h.listeners.get('basekit:open-program')({detail:{PROGRAM_KEY:'P'}});
 assert.equal(h.launches.length,3);
 assert.equal(h.navigations.length,0);
});
