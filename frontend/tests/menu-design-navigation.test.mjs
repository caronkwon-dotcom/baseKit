import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const root = '../src/modules/standard-design/';
function load(file, imports) {
 const exports = {};
 const source = ts.transpileModule(readFileSync(new URL(root + file, import.meta.url), 'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX} }).outputText;
 vm.runInNewContext(source, {exports, URLSearchParams, require:id=>imports(id)});
 return exports.default;
}
const jsx = {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
test('SD manifest orders requirement, group, menu design and existing screen design; preserves project menu',()=>{
 const module = load('module.tsx',id=>id==='react/jsx-runtime'?jsx:id.includes('actionCodes')?{COMMON_ACTIONS:{SEARCH:'SEARCH'}}:{__esModule:true,default:()=>null});
 const menus = module.menus.filter(m=>m.parentMenuKey==='STANDARD_DESIGN').sort((a,b)=>a.sortOrder-b.sortOrder);
 const start=menus.findIndex(m=>m.programKey==='SD_REQUIREMENT_DESIGN');
 assert.deepEqual(Array.from(menus.slice(start,start+4),m=>m.programKey),['SD_REQUIREMENT_DESIGN','SD_REQUIREMENT_GROUP','SD_MENU_DESIGN','SD_SCREEN_DESIGN']);
 assert.ok(menus.some(m=>m.programKey==='SD_PROJECT_MENU'));
 assert.equal(module.programs.find(p=>p.programKey==='SD_MENU_DESIGN').routePath,'/standard-design/prototypes/menu-builder');
 assert.equal(typeof module.components.SD_MENU_DESIGN,'function');
 const catalog=JSON.parse(readFileSync(new URL('../../backend/src/main/resources/menu-execution-catalog.json',import.meta.url)));
 assert.ok(catalog.find(m=>m.MENU_ID==='STANDARD_DESIGN').PROGRAM_KEYS.includes('SD_MENU_DESIGN'));
});
function page(query,context,pathname='/window/STANDARD_DESIGN/SD_MENU_DESIGN') {
 const effects=[], updates=[];
 const params=new URLSearchParams(query);
 const Page=load('menu-builder/AnalysisMenuBuilderPage.tsx',id=>{
  if(id==='react')return {useState:v=>[typeof v==='function'?v():v,()=>{}],useEffect:fn=>effects.push(fn)};
  if(id==='react/jsx-runtime')return jsx;
  if(id==='react-router-dom')return {useSearchParams:()=>[params],useLocation:()=>({pathname}),useNavigate:()=> (next,options)=>updates.push([next,options])};
  if(id.includes('designLifecycle.repository'))return {designLifecycleRepository:{getSelectedProjectId:()=>context}};
  return {__esModule:true,default:()=>null};
 });
 const tree=Page(); effects[0]();
 return {tree,updates};
}
test('menu design carries selected context into query, preserves Window and other query parameters',()=>{
 const {updates}=page('layout=linear','SDP-001');
 assert.equal(updates[0][0].search,'layout=linear&project=SDP-001');
 assert.equal(updates[0][0].pathname,'/window/STANDARD_DESIGN/SD_MENU_DESIGN');
 assert.equal(updates[0][1].replace,true);
});

test('INNER first mount writes context against builder route instead of the previous MDI screen',()=>{
 const {updates}=page('','SDP-001','/');
 assert.equal(updates[0][0].pathname,'/standard-design/prototypes/menu-builder');
 assert.equal(updates[0][0].search,'project=SDP-001');
});
test('explicit group project wins over selected context; absent context leaves project selection available',()=>{
 assert.equal(page('project=SDP-002','SDP-001').updates.length,0);
 const {tree,updates}=page('','');
 assert.equal(updates.length,0);
 const children=tree.props.children[0].props.children;
 const select=children.find(c=>c?.type==='label').props.children[1];
 assert.equal(select.props.value,'');
});
