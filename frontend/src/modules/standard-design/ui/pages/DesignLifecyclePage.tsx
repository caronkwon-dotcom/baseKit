import { useState } from 'react';
import PageHeader from '../../../../components/common/PageHeader';
import { schemaCatalogRepository } from '../../../../features/system/tableManage/schemaCatalog.repository';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import type { DesignStatus } from '../../design-lifecycle/designLifecycle.types';

type LifecycleView = 'overview' | 'wbs' | 'requirements' | 'screens' | 'database';
const STATUS: DesignStatus[] = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'];
const label: Record<LifecycleView, string> = { overview: '프로젝트 개요', wbs: 'WBS', requirements: '요구사항', screens: '화면 설계', database: 'DB 설계' };
const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(3, '0')}`;

export default function DesignLifecyclePage({ view }: { view: LifecycleView }) {
  const [, setRevision] = useState(0);
  const data = designLifecycleRepository.getData();
  const [projectId, setProjectId] = useState(designLifecycleRepository.getSelectedProjectId());
  const [selectedId, setSelectedId] = useState('');
  const project = data.projects.find((item) => item.PROJECT_ID === projectId);
  const refresh = () => setRevision((value) => value + 1);
  const changeProject = (value: string) => { designLifecycleRepository.setSelectedProjectId(value); setProjectId(value); setSelectedId(''); };
  const related = projectId ? {
    wbs: data.wbsItems.filter((item) => item.PROJECT_ID === projectId),
    requirements: data.requirements.filter((item) => item.PROJECT_ID === projectId),
    screens: data.screens.filter((item) => item.PROJECT_ID === projectId),
    tables: data.tables.filter((item) => item.PROJECT_ID === projectId),
  } : { wbs: [], requirements: [], screens: [], tables: [] };
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get('STATUS') as DesignStatus;
    if (view === 'overview') designLifecycleRepository.saveProject({ PROJECT_ID: selectedId || nextId('SDP', data.projects.length), PROJECT_NAME: String(form.get('NAME')), CUSTOMER_NAME: String(form.get('CUSTOMER_NAME')), DESCRIPTION: String(form.get('DESCRIPTION')), STATUS: status });
    if (view === 'wbs') designLifecycleRepository.saveWbs({ WBS_ID: selectedId || nextId('WBS', data.wbsItems.length), PROJECT_ID: projectId, PARENT_WBS_ID: String(form.get('PARENT_WBS_ID')) || null, WBS_NAME: String(form.get('NAME')), WBS_LEVEL: Number(form.get('WBS_LEVEL')), STATUS: status });
    if (view === 'requirements') designLifecycleRepository.saveRequirement({ REQUIREMENT_ID: selectedId || nextId('REQ', data.requirements.length), PROJECT_ID: projectId, REQUIREMENT_NAME: String(form.get('NAME')), DESCRIPTION: String(form.get('DESCRIPTION')), STATUS: status, WBS_IDS: String(form.get('WBS_IDS')).split(',').map((value) => value.trim()).filter(Boolean), SCREEN_IDS: String(form.get('SCREEN_IDS')).split(',').map((value) => value.trim()).filter(Boolean), TABLE_IDS: String(form.get('TABLE_IDS')).split(',').map((value) => value.trim()).filter(Boolean) });
    if (view === 'screens') designLifecycleRepository.saveScreen({ SCREEN_ID: selectedId || nextId('SCR', data.screens.length), PROJECT_ID: projectId, SCREEN_NAME: String(form.get('NAME')), SCREEN_TYPE: form.get('SCREEN_TYPE') as 'LIST' | 'DETAIL' | 'POPUP', DESCRIPTION: String(form.get('DESCRIPTION')), STATUS: status, FIELDS: [] });
    if (view === 'database') designLifecycleRepository.saveTable({ TABLE_ID: selectedId || nextId('TBL', data.tables.length), PROJECT_ID: projectId, TABLE_NAME: String(form.get('NAME')), LOGICAL_NAME: String(form.get('LOGICAL_NAME')), DESCRIPTION: String(form.get('DESCRIPTION')), STATUS: status, CATALOG_TABLE_KEY: String(form.get('CATALOG_TABLE_KEY')) || undefined, COLUMNS: [] });
    setSelectedId(''); refresh();
  };
  const rows = view === 'wbs' ? related.wbs : view === 'requirements' ? related.requirements : view === 'screens' ? related.screens : view === 'database' ? related.tables : data.projects;
  const selected = rows.find((item) => ('WBS_ID' in item ? item.WBS_ID : 'REQUIREMENT_ID' in item ? item.REQUIREMENT_ID : 'SCREEN_ID' in item ? item.SCREEN_ID : 'TABLE_ID' in item ? item.TABLE_ID : item.PROJECT_ID) === selectedId);
  const itemId = (item: typeof rows[number]) => 'WBS_ID' in item ? item.WBS_ID : 'REQUIREMENT_ID' in item ? item.REQUIREMENT_ID : 'SCREEN_ID' in item ? item.SCREEN_ID : 'TABLE_ID' in item ? item.TABLE_ID : item.PROJECT_ID;
  const itemName = (item: typeof rows[number]) => 'WBS_NAME' in item ? item.WBS_NAME : 'REQUIREMENT_NAME' in item ? item.REQUIREMENT_NAME : 'SCREEN_NAME' in item ? item.SCREEN_NAME : 'TABLE_NAME' in item ? item.LOGICAL_NAME : item.PROJECT_NAME;

  return <div className="page standard-design-page">
    <PageHeader breadcrumbs={['Standard Design', '프로젝트 관리', label[view]]} description="프로젝트 Context를 유지하며 설계 산출물과 요구사항 추적성을 관리합니다." />
    <section className="standard-design-lifecycle-toolbar">
      <label>프로젝트<select value={projectId} onChange={(event) => changeProject(event.target.value)}>{data.projects.map((item) => <option key={item.PROJECT_ID} value={item.PROJECT_ID}>{item.PROJECT_NAME}</option>)}</select></label>
      <span>현재 Context: <strong>{project?.PROJECT_NAME ?? '프로젝트 없음'}</strong></span>
      <button type="button" className="secondary-button" onClick={() => setSelectedId('')}>신규</button>
    </section>
    {view === 'overview' ? <section className="standard-design-lifecycle-summary">{[['WBS', related.wbs.length], ['요구사항', related.requirements.length], ['화면', related.screens.length], ['DB 테이블', related.tables.length]].map(([name, count]) => <div key={String(name)}><strong>{count}</strong><span>{name}</span></div>)}</section> : null}
    <div className="standard-design-lifecycle-layout">
      <section className="metadata-list"><div className="metadata-list-title"><h2>{label[view]} 목록</h2><span>{rows.length}건</span></div><div className="metadata-table-wrap"><table><thead><tr><th>ID</th><th>명칭</th><th>상태</th></tr></thead><tbody>{rows.map((item) => <tr className={itemId(item) === selectedId ? 'selected-row' : 'clickable-row'} key={itemId(item)} onClick={() => setSelectedId(itemId(item))}><td><code>{itemId(item)}</code></td><td>{itemName(item)}</td><td>{item.STATUS}</td></tr>)}</tbody></table></div></section>
      <form className="standard-design-lifecycle-form" onSubmit={save}>
        <h2>{selected ? '상세 수정' : '신규 등록'}</h2>
        <label>명칭<input name="NAME" required defaultValue={selected ? itemName(selected) : ''} /></label>
        {view === 'overview' ? <label>고객명<input name="CUSTOMER_NAME" required defaultValue={selected && 'CUSTOMER_NAME' in selected ? selected.CUSTOMER_NAME : ''} /></label> : null}
        {view === 'wbs' ? <><label>상위 WBS<select name="PARENT_WBS_ID" defaultValue={selected && 'PARENT_WBS_ID' in selected ? selected.PARENT_WBS_ID ?? '' : ''}><option value="">없음</option>{related.wbs.filter((item) => item.WBS_ID !== selectedId).map((item) => <option key={item.WBS_ID} value={item.WBS_ID}>{item.WBS_NAME}</option>)}</select></label><label>레벨<input name="WBS_LEVEL" type="number" min="1" required defaultValue={selected && 'WBS_LEVEL' in selected ? selected.WBS_LEVEL : 1} /></label></> : null}
        {view === 'screens' ? <label>화면 유형<select name="SCREEN_TYPE" defaultValue={selected && 'SCREEN_TYPE' in selected ? selected.SCREEN_TYPE : 'LIST'}><option>LIST</option><option>DETAIL</option><option>POPUP</option></select></label> : null}
        {view === 'database' ? <><label>논리명<input name="LOGICAL_NAME" required defaultValue={selected && 'LOGICAL_NAME' in selected ? selected.LOGICAL_NAME : ''} /></label><label>Schema Catalog 참조<select name="CATALOG_TABLE_KEY" defaultValue={selected && 'CATALOG_TABLE_KEY' in selected ? selected.CATALOG_TABLE_KEY ?? '' : ''}><option value="">미지정</option>{schemaCatalogRepository.getTables().map((item) => <option key={item.tableKey} value={item.tableKey}>{item.logicalName} ({item.physicalName})</option>)}</select></label></> : null}
        {view === 'requirements' ? <><label>연결 WBS ID<input name="WBS_IDS" defaultValue={selected && 'WBS_IDS' in selected ? selected.WBS_IDS.join(', ') : ''} placeholder="WBS-001, WBS-002" /></label><label>연결 화면 ID<input name="SCREEN_IDS" defaultValue={selected && 'SCREEN_IDS' in selected ? selected.SCREEN_IDS.join(', ') : ''} placeholder="SCR-001" /></label><label>연결 테이블 ID<input name="TABLE_IDS" defaultValue={selected && 'TABLE_IDS' in selected ? selected.TABLE_IDS.join(', ') : ''} placeholder="TBL-001" /></label></> : null}
        <label>설명<textarea name="DESCRIPTION" rows={3} defaultValue={selected && 'DESCRIPTION' in selected ? selected.DESCRIPTION : ''} /></label>
        <label>상태<select name="STATUS" defaultValue={selected?.STATUS ?? 'DRAFT'}>{STATUS.map((item) => <option key={item}>{item}</option>)}</select></label>
        {view === 'requirements' && selected && 'WBS_IDS' in selected ? <div className="standard-design-traceability"><strong>추적 연결</strong><span>WBS: {selected.WBS_IDS.join(', ') || '-'}</span><span>화면: {selected.SCREEN_IDS.join(', ') || '-'}</span><span>테이블: {selected.TABLE_IDS.join(', ') || '-'}</span></div> : null}
        <div><button type="submit" className="primary-button">저장</button>{selected ? <button type="button" className="secondary-button" onClick={() => { designLifecycleRepository.deleteItem(view === 'overview' ? 'projects' : view === 'wbs' ? 'wbsItems' : view === 'requirements' ? 'requirements' : view === 'screens' ? 'screens' : 'tables', selectedId); setSelectedId(''); refresh(); }}>삭제</button> : null}</div>
      </form>
    </div>
  </div>;
}
