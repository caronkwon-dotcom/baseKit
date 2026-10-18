// Generates the server-owned menu/program allowlist without executing UI modules.
// Supported manifest values are literal menus; unsupported dynamic metadata fails the build.
import fs from 'node:fs';
import path from 'node:path';
import ts from '../frontend/node_modules/typescript/lib/typescript.js';
const root = path.resolve(import.meta.dirname, '..');
const parse = (file) => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const registryFile = path.join(root, 'frontend/src/config/moduleRegistry.ts');
const registry = parse(registryFile);
const imports = new Map();
for (const s of registry.statements) if (ts.isImportDeclaration(s) && s.importClause?.name) imports.set(s.importClause.name.text, s.moduleSpecifier.text);
let registered;
function scan(n) { if (ts.isVariableDeclaration(n) && n.name.getText(registry)==='applicationModules') registered=n.initializer; ts.forEachChild(n,scan); }
scan(registry);
if (!registered || !ts.isArrayLiteralExpression(registered)) throw Error('Unsupported module registry');
const programs=JSON.parse(fs.readFileSync(path.join(root,'frontend/meta/programs.json'),'utf8'));
const menus=JSON.parse(fs.readFileSync(path.join(root,'frontend/meta/menus.json'),'utf8'));
for (const moduleName of registered.elements) {
 const source=path.resolve(path.dirname(registryFile),imports.get(moduleName.getText(registry)));
 const file=['.tsx','.ts','/index.ts'].map(ext=>source+ext).find(f=>fs.existsSync(f));
 if (!file) throw Error(`Missing manifest ${source}`);
 const ast=parse(file); let array;
 function findPrograms(n) {
  if(ts.isPropertyAssignment(n) && n.name.getText(ast)==='programs') {
   if(!ts.isArrayLiteralExpression(n.initializer)) throw Error('Literal programs required');
   for(const item of n.initializer.elements) {
    if(!ts.isObjectLiteralExpression(item)) throw Error('Literal program required');
    const value = key => item.properties.find(p=>ts.isPropertyAssignment(p) && p.name.getText(ast)===key)?.initializer;
    const key=value('programKey'), active=value('useYn');
    if(!key || !ts.isStringLiteral(key) || !active || !ts.isStringLiteral(active)) throw Error('Literal programKey/useYn required');
    programs.push({programKey:key.text,useYn:active.text});
   }
  }
  ts.forEachChild(n,findPrograms);
 }
 findPrograms(ast);
 function find(n) { if(ts.isPropertyAssignment(n) && n.name.getText(ast)==='menus') array=n.initializer; ts.forEachChild(n,find); }
 find(ast);
 if(!array || !ts.isArrayLiteralExpression(array)) throw Error(`Literal menus required: ${file}`);
 for(const item of array.elements) {
  if(!ts.isObjectLiteralExpression(item)) throw Error('Literal menu required');
  const row={};
  for(const prop of item.properties) {
   if(!ts.isPropertyAssignment(prop)) throw Error('Literal menu properties required');
   const value=prop.initializer;
   if(ts.isStringLiteral(value)) row[prop.name.getText(ast)]=value.text;
   else if(ts.isNumericLiteral(value)) row[prop.name.getText(ast)]=Number(value.text);
   else if(value.kind===ts.SyntaxKind.NullKeyword) row[prop.name.getText(ast)]=null;
   else throw Error(`Unsupported menu value ${value.getText(ast)}`);
  }
  menus.push(row);
 }
}
function discover(folder) {
 for(const child of fs.readdirSync(folder,{withFileTypes:true})) {
  const file=path.join(folder,child.name);
  if(child.isDirectory()) discover(file);
  else if(child.name==='index.ts') {
   const ast=parse(file);
   function find(n) {
    if(ts.isVariableDeclaration(n) && n.name.getText(ast)==='program' && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
     const prop=n.initializer.properties.find(p=>ts.isPropertyAssignment(p) && p.name.getText(ast)==='programKey');
     if(!prop || !ts.isStringLiteral(prop.initializer)) throw Error('Literal discovered programKey required');
     programs.push({programKey:prop.initializer.text,useYn:'Y'});
    }
    ts.forEachChild(n,find);
   }
   find(ast);
  }
 }
}
discover(path.join(root,'frontend/src/features'));
const activePrograms=new Set(programs.filter(p=>p.useYn==='Y').map(p=>p.programKey));
if(new Set(programs.map(p=>p.programKey)).size!==programs.length) throw Error('Duplicate program ID');
const active=menus.filter(m=>m.useYn==='Y');
const byId=new Map(active.map(m=>[m.menuKey,m]));
if(byId.size!==active.length) throw Error('Duplicate menu ID');
const entries=active.filter(m=>m.menuLevel===1 && m.parentMenuKey===null).map(m=>({MENU_ID:m.menuKey,PROGRAM_KEYS:[]}));
for(const menu of active) {
 let current=menu; const seen=new Set();
 while(current.parentMenuKey!==null) {
  if(seen.has(current.menuKey)) throw Error('Menu cycle'); seen.add(current.menuKey);
  current=byId.get(current.parentMenuKey); if(!current) throw Error('Missing active parent');
 }
 const entry=entries.find(e=>e.MENU_ID===current.menuKey); if(!entry) throw Error('Missing root');
 if(menu.programKey && !activePrograms.has(menu.programKey)) throw Error(`Menu program is not active: ${menu.programKey}`);
 if(menu.programKey && !entry.PROGRAM_KEYS.includes(menu.programKey)) entry.PROGRAM_KEYS.push(menu.programKey);
}
const output=JSON.stringify(entries,null,2)+'\n';
const target=path.join(root,'backend/src/main/resources/menu-execution-catalog.json');
if(process.argv.includes('--check')) { if(fs.readFileSync(target,'utf8')!==output) throw Error('Menu catalog stale: run node scripts/generate-menu-execution-catalog.mjs'); }
else fs.writeFileSync(target,output);
console.log(`Menu catalog verified: ${entries.length} roots`);
