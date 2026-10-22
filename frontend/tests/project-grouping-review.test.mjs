import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { compareGroupingRuns, reconcileDraft } from '../src/modules/standard-design/projectgrouping/projectGroupingApi.ts';

function harness(review = false) {
 const group={GROUP_ID:'g1',TITLE:'검증 그룹',REASON:'AI 원본 근거',REVIEW_STATUS:'DRAFT',MEMBERS:[{REQUIREMENT_ID:'r1',REASON:'개별 근거'},{REQUIREMENT_ID:'r2',REASON:''}]};
 const run={ANALYSIS_ID:'a1',STATUS:'SUCCESS',VERSION:1,CREATED_AT:'2026-10-20T00:00:00Z',INPUT:[{REQUIREMENT_ID:'r1',REQUIREMENT_NAME:'요구사항1',REQUIREMENT_REVISION:2,DESCRIPTION:'분석 당시 원문\n두 번째 줄',PROCESS_DESCRIPTION:'업무 순서',DESIGN_OPINION:'검토 의견'},{REQUIREMENT_ID:'r2',REQUIREMENT_NAME:'요구사항2',REQUIREMENT_REVISION:1}],DRAFT:{GROUPS:[group],UNCLASSIFIED:[]},AI_DRAFT:{GROUPS:[structuredClone(group)],UNCLASSIFIED:[]},REGISTERED:[]};
 const previous={...structuredClone(run),ANALYSIS_ID:'a0'};
 previous.AI_DRAFT.GROUPS[0].REASON='이전 근거';
 const calls=[];
 const api={history:async()=>[{ANALYSIS_ID:'a1',STATUS:'SUCCESS',CREATED_AT:run.CREATED_AT},{ANALYSIS_ID:'a0',STATUS:'SUCCESS',CREATED_AT:run.CREATED_AT}],get:async(_,id)=>structuredClone(id==='a1'?run:previous),save:async(project,current,draft)=>{calls.push(['save',project,current.VERSION,structuredClone(draft)]);return {...current,VERSION:2,DRAFT:structuredClone(draft)};},register:async(project,current,ids)=>{calls.push(['register',project,current.VERSION,[...ids]]);return {...current,REGISTERED:ids.map(id=>({DRAFT_GROUP_ID:id,REQUIREMENT_GROUP_ID:'saved'}))};}};
 const hooks=new Map(), effects=[]; let current, slot;
 const react={useState(initial){const index=slot++;if(!(index in current.values))current.values[index]=typeof initial==='function'?initial():initial;const context=current;return [current.values[index],value=>{context.values[index]=typeof value==='function'?value(context.values[index]):value;}];},useRef(initial){const index=slot++;return current.values[index]??(current.values[index]={current:initial});},useCallback:fn=>fn,useEffect(fn,deps){const index=slot++;const old=current.values[index];if(!old||deps.some((value,i)=>value!==old[i])){current.values[index]=deps;effects.push(fn);}}};
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
 const cache={};
 function load(name){if(cache[name])return cache[name];const exports={};const code=ts.transpileModule(readFileSync(new URL('../src/modules/standard-design/ui/components/'+name+'.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const require=id=>id==='react'?react:id==='react/jsx-runtime'?jsx:id.includes('components/common')?{ActionButton:p=>jsx.jsx('button',{...p,children:p.label}),BaseKitMessage:p=>jsx.jsx('p',{children:p.message})}:id.includes('projectGroupingApi')?{projectGroupingApi:api,compareGroupingRuns,reconcileDraft}:id.startsWith('./ProjectGrouping')?load(id.slice(2)):{};
 vm.runInNewContext(code,{exports,require,window:{location:{hash:'#/standard-design/requirement-groups'},addEventListener(){},removeEventListener(){},confirm:()=>true},crypto:{randomUUID:()=> 'uuid'},URLSearchParams,Set,Map,JSON,Date});cache[name]=exports;return exports;}
 const Root=load(review?'ProjectGroupingReview':'ProjectGroupingWorkspace').default;
 function expand(node){if(!node||typeof node!=='object')return node;if(Array.isArray(node))return node.map(expand);if(typeof node.type==='function'){const parent=current,oldSlot=slot;current=hooks.get(node.type)??{values:[]};hooks.set(node.type,current);slot=0;const result=expand(node.type(node.props));current=parent;slot=oldSlot;return result;}return {...node,props:{...node.props,children:expand(node.props?.children)}};}
 let tree;const render=()=>{tree=expand(jsx.jsx(Root,{projectId:'p1',count:2,onBack(){}}));return tree;};
 function walk(node){return !node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(walk):[node,...walk(node.props?.children)];}
 const nodes=()=>walk(tree);
 const text=node=>!node?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.props?.children);
 const button=label=>nodes().find(node=>node.type==='button'&&text(node)===label);
 async function ready(){render();effects.splice(0).forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));render();}
 return {ready,render,nodes,text,button,calls,run};
}

test('original and review have independent result DOM, with identical shared heading/history/actions',async()=>{
 const original=harness(),review=harness(true);await original.ready();await review.ready();
 assert.equal(original.nodes().filter(n=>n.type==='details').length,0);
 assert.equal(review.nodes().filter(n=>n.type==='details').length,2);
 assert.equal(original.nodes().some(n=>n.props?.className==='pg-review'),false);
 for(const label of ['다시 분석','새로고침','이력 비교','초안 저장','선택 0개 등록'])assert.equal(original.button(label)?.props.disabled,review.button(label)?.props.disabled);
 assert.ok(review.text(review.render()).includes('분석 당시 원문\n두 번째 줄'));
 assert.ok(review.text(review.render()).includes('업무 순서'));
 assert.ok(review.text(review.render()).includes('검토 의견'));
 assert.ok(review.text(review.render()).includes('개별 근거'));
 assert.ok(review.text(review.render()).includes('등록된 내용 없음'));
 assert.equal(review.calls.length,0);
});

for(const review of [false,true])test((review?'review':'original')+' preserves compare and approval/save/register optimistic version flow',async()=>{
 const h=harness(review);await h.ready();
 h.button('이력 비교').props.onClick();h.render();await h.button('비교하기').props.onClick();await new Promise(resolve=>setImmediate(resolve));h.render();
 assert.ok(h.text(h.render()).includes('이전 근거'));
 h.button('검토 승인').props.onClick();h.render();
 const checkbox=h.nodes().find(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props['aria-label']==='검증 그룹 등록 선택');
 assert.equal(checkbox.props.disabled,false);checkbox.props.onChange({target:{checked:true}});h.render();
 await h.button('선택 1개 등록').props.onClick();await new Promise(resolve=>setImmediate(resolve));h.render();
 assert.deepEqual(h.calls.map(c=>c[0]),['save','register']);
 assert.equal(h.calls[0][2],1);assert.equal(h.calls[1][2],2);assert.deepEqual(h.calls[1][3],['g1']);
 assert.equal(h.run.DRAFT.GROUPS[0].REVIEW_STATUS,'DRAFT');
 assert.ok(h.text(h.render()).includes('그룹관리 등록됨'));
});
