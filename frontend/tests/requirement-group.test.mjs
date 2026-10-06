import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeGroupMembers, groupInput } from '../src/modules/standard-design/requirementgroup/requirementGroupApi.ts';
const member=(id,analysis=[],human='N')=>({REQUIREMENT_ID:id,HUMAN_YN:human,INCLUSION_REASON:'사용자 판단',REVIEWED_REVISION:3,SOURCE_ANALYSIS_IDS:analysis});
test('same Requirement across independent runs retains one member and all evidence without erasing human decisions',()=>{
 const existing=[member('R1',['A1'],'Y')];
 const result=mergeGroupMembers(existing,[{...member('R1',['A2']),INCLUSION_REASON:'다른 입력',REVIEWED_REVISION:4},member('R1',['A1']),member('R2',['A3'])]);
 assert.equal(result.length,2);assert.equal(result[0].HUMAN_YN,'Y');assert.deepEqual(result[0].SOURCE_ANALYSIS_IDS,['A1','A2']);assert.equal(result[0].INCLUSION_REASON,'사용자 판단');assert.equal(result[0].REVIEWED_REVISION,3);assert.deepEqual(existing[0].SOURCE_ANALYSIS_IDS,['A1']);
});
test('human and Analysis selection can mix while client never submits editable business state or snapshots',()=>{
 const members=mergeGroupMembers([member('R1',['A1'])],[member('R1',[],'Y')]);
 assert.equal(members[0].HUMAN_YN,'Y');
 const input=groupInput({PROJECT_ID:'P1',REQUIREMENT_GROUP_NAME:'그룹',DESCRIPTION:'설명',VERSION:2,REQUEST_ID:'request',GROUP_STATUS:'CONFIRMED',REQUIREMENT_GROUP_ID:'G1',MEMBERS:members.map(m=>({...m,REVIEWED_SNAPSHOT:'before',REQUIREMENT:{}}))});
 assert.equal('GROUP_STATUS' in input,false);assert.equal('REQUIREMENT' in input.MEMBERS[0],false);assert.equal('REVIEWED_SNAPSHOT' in input.MEMBERS[0],false);
});
