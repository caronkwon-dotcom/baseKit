import type { FieldDefinition, FieldOption } from '../components/metadata';
import { resolveOptionSources } from '../components/metadata';
import { coreCodeApi } from '../services/coreCodeApi';

const definitions: FieldDefinition[] = [
  {key:'PROGRAM_ID',label:'프로그램 ID',dataType:'STRING',controlType:'TEXT',displayType:'TEXT',required:true},
  {key:'PROGRAM_KEY',label:'프로그램 KEY',dataType:'STRING',controlType:'TEXT',displayType:'TEXT',required:true},
  {key:'PROGRAM_NAME',label:'프로그램명',dataType:'STRING',controlType:'TEXT',displayType:'TEXT',required:true},
  {key:'MODULE_CODE',label:'Module',dataType:'STRING',controlType:'SELECT',displayType:'TEXT',required:true,optionSource:'CODE_GROUP:PROGRAM_MODULE_CODE'},
  {key:'PROGRAM_TYPE_CODE',label:'프로그램 유형',dataType:'STRING',controlType:'SELECT',displayType:'BADGE',required:true,optionSource:'CODE_GROUP:PROGRAM_TYPE_CODE'},
  {key:'ROUTE',label:'Route',dataType:'STRING',controlType:'TEXT',displayType:'TEXT',required:true},
  {key:'DESCRIPTION',label:'설명',dataType:'STRING',controlType:'TEXT',displayType:'TEXT',required:false},
  {key:'USE_YN',label:'사용 여부',dataType:'STRING',controlType:'SELECT',displayType:'BADGE',required:true,options:[{value:'Y',label:'사용'},{value:'N',label:'미사용'}]},
];
export async function getProgramFieldDefinitions(){
  const sources=definitions.flatMap(f=>f.optionSource?[f.optionSource]:[]);
  const resolved=await resolveOptionSources(sources,{CODE_GROUP:async id=>(await coreCodeApi.findCodes(id,'','Y')).map(c=>({value:c.CODE,label:c.CODE_NAME} as FieldOption))});
  return definitions.map(f=>f.optionSource?{...f,options:resolved.get(f.optionSource)??[]}:f);
}
