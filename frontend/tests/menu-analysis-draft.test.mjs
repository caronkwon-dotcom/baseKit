import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisDraft } from '../src/modules/standard-design/menu-builder/analysisDraft.ts';
import { moveMenu, parseDraft } from '../src/modules/standard-design/menu-builder/menuBuilder.ts';
const group={PROJECT_ID:'P1',REQUIREMENT_GROUP_ID:'G1',REQUIREMENT_GROUP_NAME:'구매',DESCRIPTION:'설명',VERSION:2,GROUP_STATUS:'DRAFT',MEMBERS:[{REQUIREMENT_ID:'R1'}]};
const requirements=[{PROJECT_ID:'P1',REQUIREMENT_ID:'R1',REQUIREMENT_NAME:'등록',DISCARDED_YN:'N',PROJECT_MENU_IDS:['M1'],MENU_KEYS:['legacy']}];
const menus=[{PROJECT_MENU_ID:'M1',MENU_NAME:'기존 구매'}];
const run={ANALYSIS_ID:'A1',ANALYSIS_TYPE:'GROUP_DESIGN',STATUS:'SUCCESS',GROUP_VERSION:2,RESPONSE:{programCandidates:[{name:'구매 등록',purpose:'등록 화면',evidenceRequirementIds:['R1']}]}};
test('real contract preserves trace and existing relationships through edits and storage',()=>{
 const input=JSON.stringify({group,requirements,menus,run});const {nodes,warnings}=analysisDraft([{group,analysis:run}],requirements,menus);
 assert.equal(warnings.length,0);assert.equal(nodes.length,2);assert.match(nodes[1].AI_REASON,/A1/);assert.match(nodes[1].AI_REASON,/기존 구매/);assert.match(nodes[1].AI_REASON,/legacy/);
 const moved=moveMenu(nodes,nodes[1].MENU_ID,nodes[0].MENU_ID,'before').nodes;
 assert.deepEqual(parseDraft(JSON.stringify(moved)),moved);assert.equal(JSON.stringify({group,requirements,menus,run}),input);
});
test('unanalysed and failed groups never generate nodes; stale results are flagged',()=>{
 for(const analysis of [undefined,{...run,STATUS:'RUNNING'},{...run,ANALYSIS_TYPE:'GROUP_RECOMMENDATION'}]) assert.equal(analysisDraft([{group,analysis}],requirements,menus).nodes.length,0);
 const stale=analysisDraft([{group:{...group,GROUP_STATUS:'REVIEW_REQUIRED'},analysis:{...run,GROUP_VERSION:1}}],requirements,menus); assert.equal(stale.nodes.length,2); assert.ok(stale.warnings.some(w=>w.includes('재분석')));
});
test('invalid, cross-group and discarded evidence is excluded, legacy candidates supported',()=>{
 for(const evidence of [[],['unknown'],['R1','unknown']]) assert.equal(analysisDraft([{group,analysis:{...run,RESPONSE:{programCandidates:[{name:'후보',evidenceRequirementIds:evidence}]}}}],requirements,menus).nodes.length,0);
 assert.equal(analysisDraft([{group,analysis:run}],[{...requirements[0],DISCARDED_YN:'Y'}],menus).nodes.length,0);
 assert.equal(analysisDraft([{group,analysis:{...run,RESPONSE:{screenCandidates:[{title:'기존 화면',description:'설명',evidenceRequirementIds:['R1','R1']}]}}}],requirements,menus).nodes[1].REQUIREMENTS.length,1);
});
import { loadAnalysisDraft } from '../src/modules/standard-design/menu-builder/loadAnalysisDraft.ts';
test('loader uses only GET, safe analysis listing and latest run; errors do not return partial drafts',async()=>{
 const original=globalThis.fetch;const calls=[];
 const responses={
  '/api/standard-design/requirement-groups?PROJECT_ID=P1':[{...group,MEMBERS:undefined}],
  '/api/standard-design/requirements?PROJECT_ID=P1':requirements,
  '/api/standard-design/project-menus?PROJECT_ID=P1':{ITEMS:menus},
  '/api/standard-design/requirement-groups/G1':group,
  '/api/standard-design/requirement-groups/G1/analyses/menu-draft':[{...run,CREATED_AT:'2026-10-18'}],
  '/api/standard-design/requirement-groups/G1/analyses/A1':run,
 };
 try {
  globalThis.fetch=async(url,init)=>{calls.push([url,init]);assert.ok(url in responses,url);return new Response(JSON.stringify({DATA:responses[url]}),{status:200});};
  assert.equal((await loadAnalysisDraft('P1')).nodes.length,2);
  assert.ok(calls.every(([,init])=>!init?.method || init.method==='GET'));
  assert.ok(!calls.some(([url])=>url.endsWith('/analyses')));
  responses['/api/standard-design/requirement-groups/G1/analyses/menu-draft']=[{...run,STATUS:'RUNNING',CREATED_AT:'2026-10-19'},{...run,CREATED_AT:'2026-10-18'}];
  responses['/api/standard-design/requirement-groups/G1/analyses/A1']={...run,STATUS:'RUNNING'};
  assert.equal((await loadAnalysisDraft('P1')).nodes.length,0);
  globalThis.fetch=async()=>new Response('{}',{status:500});
  await assert.rejects(loadAnalysisDraft('P1'));
 } finally {globalThis.fetch=original;}
});
