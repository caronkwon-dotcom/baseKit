import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptGroupAnalysis } from '../src/modules/standard-design/requirementgroup/groupAnalysisAdapter.ts';
const design = response => ({STATUS:'SUCCESS',ANALYSIS_TYPE:'GROUP_DESIGN',ANALYSIS_ID:'GA-1',GROUP_VERSION:3,RESPONSE:response});
test('current design maps purpose, summary, evidence and preserves source without mutation',()=>{
 const response={summary:{text:'요약'},businessAreas:[{name:'업무',description:'설명',evidenceRequirementIds:['R1']}],programCandidates:[{name:'프로그램',purpose:'목적',evidenceRequirementIds:['R1']}],observations:['검토'],extra:{untouched:true}};
 const run={...design(response),REQUEST_JSON:' { "snapshot": true } ',RESPONSE_RAW_JSON:' raw HTTP '};
 const before=JSON.stringify(run); const out=adaptGroupAnalysis(run);
 assert.equal(out.SUMMARY,'요약');assert.equal(out.SECTIONS[1].ITEMS[0].DESCRIPTION,'목적');
 assert.deepEqual(out.SECTIONS[0].ITEMS[0].EVIDENCE_REQUIREMENT_IDS,['R1']);
 out.SECTIONS[0].ITEMS[0].EVIDENCE_REQUIREMENT_IDS.push('R2');
 assert.equal(JSON.stringify(run),before);assert.equal(out.SOURCE.REQUEST_JSON,run.REQUEST_JSON);assert.equal(out.SOURCE.RESPONSE_RAW_JSON,run.RESPONSE_RAW_JSON);
 assert.deepEqual(JSON.parse(out.SOURCE.RESPONSE_JSON),response);
});
test('legacy direct and HTTP envelope JSON map all available sections without choosing one schema',()=>{
 const response={summary:'legacy',businessStructure:[{title:'old',purpose:'purpose'}],processes:[],screenCandidates:[],businessAreas:[],observations:[{note:'check'}]};
 for(const raw of [JSON.stringify(response),JSON.stringify({choices:[{message:{content:JSON.stringify(response)}}]})]) {
  const out=adaptGroupAnalysis({...design(undefined),RESPONSE_RAW_JSON:raw});
  assert.equal(out.SUMMARY,'legacy');assert.equal(out.SECTIONS.length,4);assert.equal(out.SECTIONS[1].ITEMS[0].TITLE,'old');assert.deepEqual(out.OBSERVATIONS,['{"note":"check"}']);
 }
});
test('recommendations use validated API data and retain exact reasons and order',()=>{
 const response={recommendedRequirements:[{requirementId:'R2',reason:' 원문 사유 '},{requirementId:'R1',reason:'두번째'}]};
 const base={STATUS:'SUCCESS',ANALYSIS_TYPE:'GROUP_RECOMMENDATION',RESPONSE_RAW_JSON:'{"recommendedRequirements":[{"requirementId":"unsafe","reason":"raw"}]}'};
 for(const run of [{...base,RESPONSE:response},{...base,RESPONSE_VALIDATED_JSON:JSON.stringify(response)}]) {
  const out=adaptGroupAnalysis(run);assert.deepEqual(out.RECOMMENDATIONS,[{REQUIREMENT_ID:'R2',REASON:' 원문 사유 '},{REQUIREMENT_ID:'R1',REASON:'두번째'}]);assert.deepEqual(out.SECTIONS,[]);
 }
 assert.deepEqual(adaptGroupAnalysis(base).RECOMMENDATIONS,[]);
 assert.deepEqual(adaptGroupAnalysis({...base,RESPONSE:{recommendedRequirements:[]}}).WARNINGS,[]);
});
test('missing, malformed, scalar and truncated results remain safe and preserve raw',()=>{
 for(const raw of ['{', 'null', '[]', '42', '{"choices":[{}]}']) {
  const out=adaptGroupAnalysis({...design(undefined),RESPONSE_RAW_JSON:raw});
  assert.deepEqual(out.SECTIONS,[]);assert.ok(out.WARNINGS.length);assert.equal(out.SOURCE.RESPONSE_RAW_JSON,raw);
 }
 const out=adaptGroupAnalysis(design({summary:null,businessAreas:[null,7,{}, {evidenceRequirementIds:['R1',null]}],processes:{},observations:[null,3,'ok']}));
 assert.equal(out.SECTIONS[0].ITEMS.length,2);assert.equal(out.SECTIONS[0].ITEMS[0].TITLE,'후보 3');assert.deepEqual(out.OBSERVATIONS,['ok']);assert.ok(out.WARNINGS.length>=5);
 assert.deepEqual(adaptGroupAnalysis({}).RECOMMENDATIONS,[]);
});
test('running and every failed status never present partial response as successful data',()=>{
 for(const STATUS of ['RUNNING','FAILED_TIMEOUT','FAILED_LLM','FAILED_INVALID_JSON','FAILED_TRUNCATED','CALL_FAILED','PARSE_FAILED']) {
  const out=adaptGroupAnalysis({...design({summary:{text:'partial'},businessAreas:[{}]}),STATUS});
  assert.equal(out.STATUS,STATUS);assert.equal(out.SUMMARY,'');assert.deepEqual(out.SECTIONS,[]);
 }
 assert.equal(adaptGroupAnalysis({...design({summary:{text:'old'}}),STATUS:'SUCCEEDED'}).SUMMARY,'old');
});
test('invalid recommendation fields are warned and never coerced into IDs or reasons',()=>{
 const out=adaptGroupAnalysis({STATUS:'SUCCESS',ANALYSIS_TYPE:'GROUP_RECOMMENDATION',WARNINGS:['server warning',3],RESPONSE:{recommendedRequirements:[null,{requirementId:3,reason:{}},{requirementId:'R',reason:' '}]}});
 assert.deepEqual(out.RECOMMENDATIONS,[]);assert.equal(out.WARNINGS.length,4);
});


// Exercise the actual SD display projection through COMMON's rendering model.
import { buildLlmResultModel } from '../src/components/common/llmResultModel.ts';
test('SD projection renders COMMON summary, sections, cards and evidence without mutating source',()=>{
 const run=design({summary:{text:'설계 요약'},businessAreas:[{name:'주문',description:'주문 처리',evidenceRequirementIds:['R1']}],observations:['검토 필요']});
 const before=JSON.stringify(run);
 const model=buildLlmResultModel(adaptGroupAnalysis(run).VIEWER_RESULT);
 assert.equal(model.status,'structured');
 assert.ok(model.blocks.some(b=>b.type==='summary' && b.body==='설계 요약'));
 assert.ok(model.blocks.some(b=>b.type==='section' && b.heading==='업무영역'));
 assert.ok(model.blocks.some(b=>b.type==='cards' && b.cards[0].title==='주문' && b.cards[0].fields.some(f=>f.label==='근거' && f.value==='R1')));
 assert.ok(model.evidence.some(e=>e.id==='R1'));
 assert.equal(JSON.stringify(run),before);
});
test('validated recommendation cards preserve reason and never fall back to unvalidated raw',()=>{
 const run={STATUS:'SUCCESS',ANALYSIS_TYPE:'GROUP_RECOMMENDATION',RESPONSE:{recommendedRequirements:[{requirementId:'R2',reason:' 원본 추천 사유 '}]}};
 const model=buildLlmResultModel(adaptGroupAnalysis(run).VIEWER_RESULT);
 assert.ok(model.blocks.some(b=>b.type==='cards' && b.cards[0].title==='R2' && b.cards[0].fields.some(f=>f.value===' 원본 추천 사유 ')));
 assert.equal(buildLlmResultModel(adaptGroupAnalysis({...run,RESPONSE:undefined,RESPONSE_RAW_JSON:JSON.stringify(run.RESPONSE)}).VIEWER_RESULT).status,'empty');
});
test('text, malformed JSON, empty and unsuccessful results are safe in COMMON',()=>{
 for(const raw of ['일반 텍스트','{"summary":']) {
  const display=adaptGroupAnalysis({...design(undefined),RESPONSE_RAW_JSON:raw});
  const model=buildLlmResultModel(display.VIEWER_RESULT);
  assert.equal(model.status,'text');assert.equal(model.text,raw);assert.ok(display.WARNINGS.length);
 }
 for(const RESPONSE of [null,{}, {recommendedRequirements:[]}]) assert.equal(buildLlmResultModel(adaptGroupAnalysis(design(RESPONSE)).VIEWER_RESULT).status,'empty');
 for(const STATUS of ['RUNNING','FAILED_INVALID_JSON','FAILED_TRUNCATED']) {
  const display=adaptGroupAnalysis({...design({summary:'partial'}),STATUS});
  assert.equal(buildLlmResultModel(display.VIEWER_RESULT,{loading:STATUS==='RUNNING'}).status,STATUS==='RUNNING' ? 'loading':'empty');
 }
});
