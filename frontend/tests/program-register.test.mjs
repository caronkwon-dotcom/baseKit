import test from 'node:test';
import assert from 'node:assert/strict';
import {designProgramApi as api} from '../src/modules/standard-design/programs/designProgramApi.ts';

test('project and analysis identifiers remain scoped when they contain URL punctuation',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,init)=>{calls.push([url,init]);return {ok:true,json:async()=>({DATA:[]})};};
 try{
  await api.list('P/A?B');await api.candidates('P/A?B','G&1','A#2');
  assert.equal(calls[0][0],'/api/standard-design/projects/P%2FA%3FB/programs');
  const query=new URL(calls[1][0],'http://local').searchParams;
  assert.equal(query.get('GROUP_ID'),'G&1');assert.equal(query.get('ANALYSIS_ID'),'A#2');
 }finally{globalThis.fetch=original;}
});
test('editing preserves the server program ID and sends the observed version',async()=>{
 const original=globalThis.fetch;let call;
 globalThis.fetch=async(url,init)=>{call=[url,init];return {ok:true,json:async()=>({DATA:{PROGRAM_ID:'SDPG-stable',VERSION:8}})};};
 try{
  const result=await api.save('P1','SDPG-stable',{PROGRAM_NAME:'edited',DESCRIPTION:'description',VERSION:7});
  assert.equal(result.PROGRAM_ID,'SDPG-stable');assert.equal(call[1].method,'PUT');assert.equal(JSON.parse(call[1].body).VERSION,7);
 }finally{globalThis.fetch=original;}
});
test('duplicate adoption and API failures are surfaced instead of creating local fallback programs',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>({ok:false,status:409,json:async()=>({MESSAGE:'이미 등록한 분석 후보입니다.'})});
 try{await assert.rejects(api.adopt('P1','G1','A1',[0]),/이미 등록/);await assert.rejects(api.list('P1'),/이미 등록/);}finally{globalThis.fetch=original;}
});
