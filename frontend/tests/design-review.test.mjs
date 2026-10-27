import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisEvidence, loadDesignReview, designReviewUrl, groupAnalysisUrl } from '../src/modules/standard-design/requirementgroup/designReview.ts';
import { adaptGroupAnalysis } from '../src/modules/standard-design/requirementgroup/groupAnalysisAdapter.ts';
const run={ANALYSIS_ID:'A1',REQUIREMENT_GROUP_ID:'G1',ANALYSIS_TYPE:'GROUP_DESIGN',STATUS:'SUCCESS',GROUP_VERSION:2};
const snapshot=(requirements,extra={})=>({...run,REQUEST_JSON:JSON.stringify({project:{projectId:'P1'},group:{groupId:'G1'},requirements,...extra})});
test('snapshot names/revisions and descriptions survive current revision changes without mutation',()=>{
 const input=snapshot([{requirementId:'R1',name:'당시 명칭',revision:1,description:'당시 본문',processDescription:'당시 순서'}]);
 const before=JSON.stringify(input);
 const result=analysisEvidence(input,[{PROJECT_ID:'P1',REQUIREMENT_ID:'R1',REQUIREMENT_REVISION:4,REQUIREMENT_NAME:'현재 명칭'}],'P1','G1');
 assert.equal(result.ROWS[0].NAME,'당시 명칭');assert.equal(result.ROWS[0].DESCRIPTION,'당시 본문');assert.equal(result.ROWS[0].REVISION,1);assert.equal(result.ROWS[0].CURRENT_REVISION,4);assert.ok(result.ROWS[0].STALE);assert.ok(result.WARNINGS.some(s=>s.includes('낡은 분석')));assert.equal(JSON.stringify(input),before);
});
test('missing/malformed snapshots and unknown revisions are warned without current-data fabrication',()=>{
 for(const REQUEST_JSON of [undefined,'{','null','{}','[]']) {
  const result=analysisEvidence({...run,REQUEST_JSON},[],'P1','G1');assert.equal(result.ROWS.length,0);assert.ok(result.WARNINGS.length);
 }
 const out=analysisEvidence(snapshot([{requirementId:'R1'}]),[{PROJECT_ID:'P1',REQUIREMENT_ID:'R1',REQUIREMENT_NAME:'현재 이름'}],'P1','G1');assert.equal(out.ROWS[0].NAME,'');assert.equal(out.ROWS[0].REVISION,null);assert.ok(out.WARNINGS.length);
 for(const extra of [{project:{projectId:'P2'}},{group:{groupId:'G2'}}]) assert.throws(()=>analysisEvidence(snapshot([],extra),[],'P1','G1'),/일치/);
});
test('deleted, discarded, and foreign-project requirements cannot make old evidence current',()=>{
 for(const current of [[],[{PROJECT_ID:'P2',REQUIREMENT_ID:'R1',REQUIREMENT_REVISION:1}],[{PROJECT_ID:'P1',REQUIREMENT_ID:'R1',REQUIREMENT_REVISION:1,DISCARDED_YN:'Y'}]]) assert.ok(analysisEvidence(snapshot([{requirementId:'R1',revision:1}]),current,'P1','G1').ROWS[0].STALE);
});
test('URLs retain exact run identity and shell context; return retains analysis tab',()=>{
 const url=designReviewUrl('P 1','G/1','A&1','/standard-design/requirement-groups');const q=new URLSearchParams(url.split('?')[1]);assert.ok(url.startsWith('#/standard-design/design-review?'));assert.equal(q.get('analysis'),'A&1');assert.equal(q.get('group'),'G/1');
 const windowUrl=designReviewUrl('P1','G1','A1','/window/SD/SD_REQUIREMENT_GROUP');assert.ok(windowUrl.includes('/window/SD/SD_REQUIREMENT_GROUP?'));assert.equal(new URLSearchParams(windowUrl.split('?')[1]).get('workspace'),'design-review');
 const back=groupAnalysisUrl('P1','G1','A1','/window/SD/SD_REQUIREMENT_GROUP');assert.equal(new URLSearchParams(back.split('?')[1]).get('tab'),'analysis');assert.equal(new URLSearchParams(back.split('?')[1]).get('analysis'),'A1');
});
test('review loader only GETs audited endpoints and never replaces an older selected execution',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,init)=>{calls.push([url,init?.method ?? 'GET']);return {ok:true,json:async()=>({DATA:url.endsWith('/G1')?{REQUIREMENT_GROUP_ID:'G1',PROJECT_ID:'P1',VERSION:5}:url.endsWith('/A1')?run:url.endsWith('/menu-draft')?[{...run,ANALYSIS_ID:'A2'},run]:[]})};};
 try {const out=await loadDesignReview('P1','G1','A1');assert.equal(out.analysis.ANALYSIS_ID,'A1');assert.equal(out.group.VERSION,5);assert.equal(calls.length,4);assert.ok(calls.every(([,method])=>method==='GET'));assert.ok(calls.some(([url])=>url.endsWith('/analyses/menu-draft')));assert.ok(!calls.some(([url])=>url.endsWith('/analyses')));}finally{globalThis.fetch=original;}
});
test('loader propagates missing IDs, wrong project/run/type and API permission/not-found failures',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=()=>{throw Error('must not fetch');};await assert.rejects(loadDesignReview('P1','G1',''),/ID/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({DATA:{REQUIREMENT_GROUP_ID:'G1',PROJECT_ID:'P2'}})});await assert.rejects(loadDesignReview('P1','G1','A1'),/불일치/);
  for(const bad of [{...run,REQUIREMENT_GROUP_ID:'G2'},{...run,ANALYSIS_ID:'A2'},{...run,ANALYSIS_TYPE:'GROUP_RECOMMENDATION'}]) {
   globalThis.fetch=async url=>({ok:true,json:async()=>({DATA:url.endsWith('/G1')?{REQUIREMENT_GROUP_ID:'G1',PROJECT_ID:'P1'}:url.endsWith('/A1')?bad:[]})});await assert.rejects(loadDesignReview('P1','G1','A1'),/GROUP_DESIGN/);
  }
  for(const status of [401,403,404,500]) {globalThis.fetch=async()=>({ok:false,status,json:async()=>({MESSAGE:'API '+status})});await assert.rejects(loadDesignReview('P1','G1','A1'),new RegExp('API '+status));}
 } finally {globalThis.fetch=original;}
});
test('empty fields remain empty, purpose maps correctly and failures never show partial candidates',()=>{
 const out=adaptGroupAnalysis({...run,RESPONSE:{summary:{text:''},businessAreas:[{}],programCandidates:[{name:'후보 실제 명칭',purpose:'실제 목적',evidenceRequirementIds:['R1']}] }},'이름 미제공');assert.equal(out.SUMMARY,'');assert.equal(out.SECTIONS[0].ITEMS[0].TITLE,'이름 미제공');assert.equal(out.SECTIONS[1].ITEMS[0].TITLE,'후보 실제 명칭');assert.equal(out.SECTIONS[1].ITEMS[0].DESCRIPTION,'실제 목적');
 for(const STATUS of ['RUNNING','FAILED_LLM','CALL_FAILED','PARSE_FAILED','FAILED_TIMEOUT','FAILED_INVALID_JSON','FAILED_TRUNCATED'])assert.deepEqual(adaptGroupAnalysis({...run,STATUS,RESPONSE:{businessAreas:[{name:'partial'}]}}).SECTIONS,[]);
});
