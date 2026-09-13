import { useState, type FormEvent, type ReactNode } from 'react';
import DataTable, { type DataTableColumn } from '../../../../components/common/DataTable';
import MasterDetailMultiGrid from '../../../../components/common/MasterDetailMultiGrid';
import PageHeader from '../../../../components/common/PageHeader';
import { schemaCatalogRepository } from '../../../../features/system/tableManage/schemaCatalog.repository';
import { designLifecycleRepository } from '../../design-lifecycle/designLifecycle.repository';
import type { DbColumnDefinition, DesignStatus, ScreenField } from '../../design-lifecycle/designLifecycle.types';

type LifecycleView = 'overview' | 'wbs' | 'requirements' | 'screens' | 'database';
type LifecycleItem = ReturnType<typeof getRows>[number];

const STATUS: DesignStatus[] = ['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'];
const labels: Record<LifecycleView, string> = { overview: '프로젝트 관리', wbs: 'WBS', requirements: '요구사항', screens: '화면 설계', database: 'DB 설계' };
const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(3, '0')}`;

function getRows(view: LifecycleView, projectId: string) {
  const data = designLifecycleRepository.getData();
  if (view === 'overview') return data.projects;
  if (view === 'wbs') return data.wbsItems.filter((item) => item.PROJECT_ID === projectId);
  if (view === 'requirements') return data.requirements.filter((item) => item.PROJECT_ID === projectId);
  if (view === 'screens') return data.screens.filter((item) => item.PROJECT_ID === projectId);
  return data.tables.filter((item) => item.PROJECT_ID === projectId);
}

function itemId(item: LifecycleItem) {
  if ('WBS_ID' in item) return item.WBS_ID;
  if ('REQUIREMENT_ID' in item) return item.REQUIREMENT_ID;
  if ('SCREEN_ID' in item) return item.SCREEN_ID;
  if ('TABLE_ID' in item) return item.TABLE_ID;
  return item.PROJECT_ID;
}

function itemName(item: LifecycleItem) {
  if ('WBS_NAME' in item) return item.WBS_NAME;
  if ('REQUIREMENT_NAME' in item) return item.REQUIREMENT_NAME;
  if ('SCREEN_NAME' in item) return item.SCREEN_NAME;
  if ('TABLE_NAME' in item) return item.LOGICAL_NAME;
  return item.PROJECT_NAME;
}

function parseDataType(dataType: string) {
  const match = /^(.*?)(?:\(([^,)]+)(?:,([^,)]+))?\))?$/.exec(dataType);
  return { type: match?.[1] ?? dataType, length: match?.[2] ?? '-', scale: match?.[3] ?? '-' };
}

function ScreenFieldGrid({ rows }: { rows: ScreenField[] }) {
  const columns: DataTableColumn<ScreenField>[] = [
      { key: 'name', header: '물리명', render: (row) => row.FIELD_NAME, minWidth: 110 },
      { key: 'logical', header: '논리명', render: (row) => row.LOGICAL_NAME, minWidth: 100 },
      { key: 'type', header: 'Datatype', render: (row) => row.DATA_TYPE, minWidth: 90 },
      { key: 'required', header: '필수', render: (row) => row.REQUIRED_YN, width: 56, align: 'center' },
      { key: 'description', header: '설명', render: (row) => row.DESCRIPTION, minWidth: 130 },
    ];
  return <section className="standard-design-lifecycle-detail-grid">
    <h2>화면 필드 <span>{rows.length}건</span></h2>
    <DataTable columns={columns} rows={rows} getRowKey={(row) => row.FIELD_ID} emptyMessage="등록된 화면 필드가 없습니다." />
  </section>;
}

function DbColumnGrid({ rows }: { rows: DbColumnDefinition[] }) {
  const columns: DataTableColumn<DbColumnDefinition>[] = [
      { key: 'name', header: '물리명', render: (row) => row.COLUMN_NAME, minWidth: 105 },
      { key: 'logical', header: '논리명', render: (row) => row.LOGICAL_NAME, minWidth: 95 },
      { key: 'domain', header: 'Domain', render: (row) => row.DOMAIN_NAME, minWidth: 80 },
      { key: 'type', header: 'Datatype', render: (row) => parseDataType(row.DATA_TYPE).type, minWidth: 75 },
      { key: 'length', header: 'Length', render: (row) => parseDataType(row.DATA_TYPE).length, width: 58, align: 'right' },
      { key: 'scale', header: 'Scale', render: (row) => parseDataType(row.DATA_TYPE).scale, width: 54, align: 'right' },
      { key: 'pk', header: 'PK', render: (row) => row.PK_YN, width: 44, align: 'center' },
      { key: 'nullable', header: 'Nullable', render: (row) => row.NULLABLE_YN, width: 68, align: 'center' },
      { key: 'description', header: '설명', render: (row) => row.DESCRIPTION, minWidth: 115 },
    ];
  return <section className="standard-design-lifecycle-detail-grid">
    <h2>테이블 컬럼 <span>{rows.length}건</span></h2>
    <DataTable columns={columns} rows={rows} getRowKey={(row) => row.COLUMN_ID} emptyMessage="등록된 테이블 컬럼이 없습니다." />
  </section>;
}

export default function DesignLifecyclePage({ view, supplement }: { view: LifecycleView; supplement?: ReactNode }) {
  const [, setRevision] = useState(0);
  const [projectId, setProjectId] = useState(designLifecycleRepository.getSelectedProjectId());
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('목록에서 대상을 선택하거나 신규 등록을 시작하세요.');
  const data = designLifecycleRepository.getData();
  const project = data.projects.find((item) => item.PROJECT_ID === projectId);
  const rows = getRows(view, projectId);
  const selected = rows.find((item) => itemId(item) === selectedId);
  const refresh = () => setRevision((value) => value + 1);
  const changeProject = (value: string) => {
    designLifecycleRepository.setSelectedProjectId(value);
    setProjectId(value);
    setSelectedId('');
    setMessage('프로젝트 Context를 변경했습니다. 이후 Lifecycle 화면에서도 유지됩니다.');
  };
  const create = () => {
    setSelectedId('');
    setMessage('신규 등록 모드입니다. 필수 항목을 입력한 후 저장하세요.');
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view !== 'overview' && !projectId) {
      setMessage('프로젝트 Context를 먼저 선택하세요.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const status = form.get('STATUS') as DesignStatus;
    if (view === 'overview') {
      const id = selectedId || nextId('SDP', data.projects.length);
      designLifecycleRepository.saveProject({ PROJECT_ID: id, PROJECT_NAME: String(form.get('NAME')).trim(), CUSTOMER_NAME: String(form.get('CUSTOMER_NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status });
      if (!projectId) changeProject(id);
    }
    if (view === 'wbs') designLifecycleRepository.saveWbs({ WBS_ID: selectedId || nextId('WBS', data.wbsItems.length), PROJECT_ID: projectId, PARENT_WBS_ID: String(form.get('PARENT_WBS_ID')) || null, WBS_NAME: String(form.get('NAME')).trim(), WBS_LEVEL: Number(form.get('WBS_LEVEL')), STATUS: status });
    if (view === 'requirements') designLifecycleRepository.saveRequirement({ REQUIREMENT_ID: selectedId || nextId('REQ', data.requirements.length), PROJECT_ID: projectId, REQUIREMENT_NAME: String(form.get('NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, WBS_IDS: String(form.get('WBS_IDS')).split(',').map((value) => value.trim()).filter(Boolean), SCREEN_IDS: String(form.get('SCREEN_IDS')).split(',').map((value) => value.trim()).filter(Boolean), TABLE_IDS: String(form.get('TABLE_IDS')).split(',').map((value) => value.trim()).filter(Boolean) });
    if (view === 'screens') designLifecycleRepository.saveScreen({ SCREEN_ID: selectedId || nextId('SCR', data.screens.length), PROJECT_ID: projectId, SCREEN_NAME: String(form.get('NAME')).trim(), SCREEN_TYPE: form.get('SCREEN_TYPE') as 'LIST' | 'DETAIL' | 'POPUP', DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, FIELDS: selected && 'FIELDS' in selected ? selected.FIELDS : [] });
    if (view === 'database') designLifecycleRepository.saveTable({ TABLE_ID: selectedId || nextId('TBL', data.tables.length), PROJECT_ID: projectId, TABLE_NAME: String(form.get('NAME')).trim(), LOGICAL_NAME: String(form.get('LOGICAL_NAME')).trim(), DESCRIPTION: String(form.get('DESCRIPTION')).trim(), STATUS: status, CATALOG_TABLE_KEY: String(form.get('CATALOG_TABLE_KEY')) || undefined, COLUMNS: selected && 'COLUMNS' in selected ? selected.COLUMNS : [] });
    setMessage(`${labels[view]} 정보를 저장했습니다.`);
    refresh();
  };
  const remove = () => {
    if (!selectedId) {
      setMessage('삭제할 대상을 먼저 선택하세요.');
      return;
    }
    const type = view === 'overview' ? 'projects' : view === 'wbs' ? 'wbsItems' : view === 'requirements' ? 'requirements' : view === 'screens' ? 'screens' : 'tables';
    designLifecycleRepository.deleteItem(type, selectedId);
    if (view === 'overview' && selectedId === projectId) {
      const nextProjectId = data.projects.find((item) => item.PROJECT_ID !== selectedId)?.PROJECT_ID ?? '';
      designLifecycleRepository.setSelectedProjectId(nextProjectId);
      setProjectId(nextProjectId);
    }
    setSelectedId('');
    setMessage(`${labels[view]} 정보를 삭제했습니다.`);
    refresh();
  };
  const columns: DataTableColumn<LifecycleItem>[] = [
    { key: 'id', header: 'ID', render: itemId, minWidth: 95 },
    { key: 'name', header: '명칭', render: itemName, minWidth: 130 },
    ...(view === 'wbs' ? [{ key: 'level', header: '레벨', render: (item: LifecycleItem) => 'WBS_LEVEL' in item ? item.WBS_LEVEL : '-', width: 56, align: 'center' as const }] : []),
    { key: 'status', header: '상태', render: (item) => item.STATUS, width: 90, align: 'center' },
  ];
  const relatedWbs = data.wbsItems.filter((item) => item.PROJECT_ID === projectId);

  const linkPanel = view === 'requirements' && selected && 'WBS_IDS' in selected
    ? <section className="standard-design-traceability"><h2>요구사항 추적성</h2><span>연결 WBS: {selected.WBS_IDS.join(', ') || '-'}</span><span>연결 화면: {selected.SCREEN_IDS.join(', ') || '-'}</span><span>연결 테이블: {selected.TABLE_IDS.join(', ') || '-'}</span></section>
    : view === 'screens' && selected && 'FIELDS' in selected
      ? <ScreenFieldGrid rows={selected.FIELDS} />
      : view === 'database' && selected && 'COLUMNS' in selected
        ? <DbColumnGrid rows={selected.COLUMNS} />
        : <section className="standard-design-lifecycle-guide"><h2>{view === 'wbs' ? '계층 WBS' : '상세 정보'}</h2><p>{view === 'wbs' ? '상위 WBS와 레벨을 지정하면 프로젝트 범위 안에서 계층 구조를 관리합니다.' : '목록에서 대상을 선택하면 관련 상세 정보가 표시됩니다.'}</p>{supplement}</section>;

  return <div className="page standard-design-page standard-design-lifecycle-page">
    <PageHeader breadcrumbs={['Standard Design', labels[view]]} description="프로젝트 Context를 유지하며 설계 산출물과 요구사항 추적성을 관리합니다." />
    <section className="standard-design-lifecycle-toolbar" aria-label={`${labels[view]} 기능`}>
      {view === 'overview' ? <label>프로젝트<select value={projectId} onChange={(event) => changeProject(event.target.value)}>{data.projects.map((item) => <option key={item.PROJECT_ID} value={item.PROJECT_ID}>{item.PROJECT_NAME}</option>)}</select></label> : <span className="standard-design-project-context">Project Context: <strong>{project?.PROJECT_NAME ?? '프로젝트 없음'}</strong></span>}
      <div className="standard-design-lifecycle-actions"><button type="button" className="secondary-button" data-action-code="SEARCH" onClick={() => { refresh(); setMessage('목록을 조회했습니다.'); }}>조회</button><button type="button" className="primary-button" data-action-code="CREATE" onClick={create}>등록</button><button type="submit" form="lifecycle-detail-form" className="primary-button" data-action-code="UPDATE">저장</button><button type="button" className="danger-button" data-action-code="DELETE" onClick={remove}>삭제</button></div>
    </section>
    <MasterDetailMultiGrid
      master={<DataTable title={`${labels[view]} 목록 (${rows.length}건)`} columns={columns} rows={rows} getRowKey={itemId} onRowClick={(item) => { setSelectedId(itemId(item)); setMessage(`${itemName(item)} 상세 정보를 불러왔습니다.`); }} selectedRowKeys={selectedId ? new Set([selectedId]) : new Set()} onSelectedRowKeysChange={(keys) => setSelectedId([...keys][0] ?? '')} emptyMessage="현재 Project Context에 등록된 항목이 없습니다." />}
      detailTop={<form id="lifecycle-detail-form" key={selectedId || 'new'} className="standard-design-lifecycle-form" onSubmit={save}><h2>{selected ? '상세 수정' : '신규 등록'}</h2><label>명칭<input name="NAME" required defaultValue={selected ? itemName(selected) : ''} /></label>{view === 'overview' ? <label>고객명<input name="CUSTOMER_NAME" required defaultValue={selected && 'CUSTOMER_NAME' in selected ? selected.CUSTOMER_NAME : ''} /></label> : null}{view === 'wbs' ? <><label>상위 WBS<select name="PARENT_WBS_ID" defaultValue={selected && 'PARENT_WBS_ID' in selected ? selected.PARENT_WBS_ID ?? '' : ''}><option value="">없음</option>{relatedWbs.filter((item) => item.WBS_ID !== selectedId).map((item) => <option key={item.WBS_ID} value={item.WBS_ID}>{item.WBS_NAME}</option>)}</select></label><label>레벨<input name="WBS_LEVEL" type="number" min="1" required defaultValue={selected && 'WBS_LEVEL' in selected ? selected.WBS_LEVEL : 1} /></label></> : null}{view === 'screens' ? <label>화면 유형<select name="SCREEN_TYPE" defaultValue={selected && 'SCREEN_TYPE' in selected ? selected.SCREEN_TYPE : 'LIST'}><option>LIST</option><option>DETAIL</option><option>POPUP</option></select></label> : null}{view === 'database' ? <><label>논리명<input name="LOGICAL_NAME" required defaultValue={selected && 'LOGICAL_NAME' in selected ? selected.LOGICAL_NAME : ''} /></label><label>Schema Catalog 참조<select name="CATALOG_TABLE_KEY" defaultValue={selected && 'CATALOG_TABLE_KEY' in selected ? selected.CATALOG_TABLE_KEY ?? '' : ''}><option value="">미지정</option>{schemaCatalogRepository.getTables().map((item) => <option key={item.tableKey} value={item.tableKey}>{item.logicalName} ({item.physicalName})</option>)}</select></label></> : null}{view === 'requirements' ? <><label>연결 WBS ID<input name="WBS_IDS" defaultValue={selected && 'WBS_IDS' in selected ? selected.WBS_IDS.join(', ') : ''} placeholder="WBS-001, WBS-002" /></label><label>연결 화면 ID<input name="SCREEN_IDS" defaultValue={selected && 'SCREEN_IDS' in selected ? selected.SCREEN_IDS.join(', ') : ''} placeholder="SCR-001" /></label><label>연결 테이블 ID<input name="TABLE_IDS" defaultValue={selected && 'TABLE_IDS' in selected ? selected.TABLE_IDS.join(', ') : ''} placeholder="TBL-001" /></label></> : null}<label>설명<textarea name="DESCRIPTION" rows={2} defaultValue={selected && 'DESCRIPTION' in selected ? selected.DESCRIPTION : ''} /></label><label>상태<select name="STATUS" defaultValue={selected?.STATUS ?? 'DRAFT'}>{STATUS.map((item) => <option key={item}>{item}</option>)}</select></label></form>}
      detailBottom={linkPanel}
      message={message}
    />
  </div>;
}
