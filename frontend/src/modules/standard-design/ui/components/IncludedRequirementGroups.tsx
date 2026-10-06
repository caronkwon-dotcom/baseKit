import { useEffect, useState } from 'react';
import { BaseKitMessage, DataTable, type DataTableColumn } from '../../../../components/common';
import { requirementGroupApi, groupStatusLabels, openRequirementGroup, type RequirementGroup } from '../../requirementgroup/requirementGroupApi';
export default function IncludedRequirementGroups({projectId,requirementId,revision}:{projectId:string;requirementId:string;revision?:number}) {
 const [rows,setRows]=useState<RequirementGroup[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;requirementGroupApi.list(projectId,requirementId).then(data=>{if(current){setRows(data);setError('');setLoading(false);}}).catch((e:Error)=>{if(current){setError(e.message);setLoading(false);}});return()=>{current=false;};},[projectId,requirementId,revision,retry]);
 const columns:DataTableColumn<RequirementGroup>[]=[{key:'name',header:'그룹명',minWidth:150,render:g=><button type="button" className="secondary-button" onClick={()=>openRequirementGroup(projectId,g.REQUIREMENT_GROUP_ID)}>{g.REQUIREMENT_GROUP_NAME}</button>},{key:'status',header:'상태',width:110,render:g=>groupStatusLabels[g.GROUP_STATUS]}];
 return <section><h3>포함된 요구사항 그룹 ({rows.length}건)</h3>{error ? <><BaseKitMessage type="error" message={error} /><button type="button" className="secondary-button" onClick={()=>setRetry(n=>n+1)}>다시 조회</button></>:loading ? <p>그룹 조회 중</p>:<DataTable columns={columns} rows={rows} getRowKey={g=>g.REQUIREMENT_GROUP_ID} emptyMessage="포함된 그룹이 없습니다." />}</section>;
}
