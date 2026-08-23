import { useMemo, useState } from 'react';
import schemaTablesJson from '../../../../meta/schema-tables.json';
import PageHeader from '../../../components/common/PageHeader';
import type { SchemaReviewStatus, SchemaTable } from './tableManage.types';

const schemaTables = schemaTablesJson as SchemaTable[];
const TERM_LABELS: Record<SchemaReviewStatus, string> = {
  EXISTING: '기존',
  APPROVED: '확정',
  REVIEW: '검토',
};

export default function TableManagePage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState(schemaTables[0]?.tableKey ?? '');

  const filteredTables = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return schemaTables.filter((table) => {
      const categoryMatched = category === 'ALL' || table.category === category;
      const keywordMatched = !normalizedKeyword || [table.logicalName, table.physicalName, table.description]
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && keywordMatched;
    });
  }, [category, keyword]);

  const selectedTable = schemaTables.find((table) => table.tableKey === selectedKey) ?? filteredTables[0];
  const reviewColumnCount = schemaTables.flatMap((table) => table.columns).filter((column) => column.termStatus === 'REVIEW').length;

  return (
    <div className="page table-manage-page">
      <PageHeader
        breadcrumbs={['시스템관리', '테이블관리']}
        description="시스템 공통 V1 테이블과 컬럼·용어·관계 정의를 DDL 확정 전에 검수합니다."
      />

      <section className="metadata-toolbar table-catalog-toolbar">
        <label>
          테이블검색
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="논리명·물리명·설명" />
        </label>
        <label>
          업무영역
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="ALL">전체</option>
            {['기준정보', '조직', '사용자', '권한'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <div className="table-catalog-summary">
          <span>테이블 <strong>{schemaTables.length}</strong>개</span>
          <span>검토 용어 <strong>{reviewColumnCount}</strong>개</span>
        </div>
      </section>

      <div className="table-catalog-layout">
        <section className="metadata-list table-catalog-list">
          <div className="metadata-list-title"><h2>테이블 목록</h2><span>총 {filteredTables.length}건</span></div>
          <div className="metadata-table-wrap">
            <table>
              <thead><tr><th>업무영역</th><th>논리명</th><th>물리명</th><th>컬럼</th><th>상태</th></tr></thead>
              <tbody>
                {filteredTables.map((table) => (
                  <tr key={table.tableKey} className={table.tableKey === selectedTable?.tableKey ? 'selected-row' : 'clickable-row'} onClick={() => setSelectedKey(table.tableKey)}>
                    <td>{table.category}</td><td>{table.logicalName}</td><td><code>{table.physicalName}</code></td><td>{table.columns.length}</td>
                    <td><span className={`schema-status ${table.status.toLowerCase()}`}>{table.status === 'WARNING' ? '주의' : '설계'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="metadata-list table-column-catalog">
          {selectedTable ? (
            <>
              <div className="table-definition-heading">
                <div><span>{selectedTable.category}</span><h2>{selectedTable.logicalName} <code>{selectedTable.physicalName}</code></h2><p>{selectedTable.description}</p></div>
                <dl><div><dt>컬럼</dt><dd>{selectedTable.columns.length}</dd></div><div><dt>PK</dt><dd>{selectedTable.columns.filter((column) => column.pkYn === 'Y').length}</dd></div><div><dt>FK</dt><dd>{selectedTable.columns.filter((column) => column.fk).length}</dd></div></dl>
              </div>
              {selectedTable.status === 'WARNING' ? <div className="schema-warning">물리 테이블명 <strong>{selectedTable.physicalName}</strong>은 DB 예약어 충돌 가능성이 있어 DDL 확정 전에 대체 명칭을 결정해야 합니다.</div> : null}
              <div className="metadata-table-wrap column-definition-wrap">
                <table>
                  <thead><tr><th>No.</th><th>논리 컬럼명</th><th>물리 컬럼명</th><th>도메인</th><th>데이터 타입</th><th>PK</th><th>필수</th><th>참조 FK</th><th>용어</th><th>설명</th></tr></thead>
                  <tbody>
                    {selectedTable.columns.map((column, index) => (
                      <tr key={column.physicalName}>
                        <td>{index + 1}</td><td>{column.logicalName}</td><td><code>{column.physicalName}</code></td><td>{column.domain}</td><td>{column.dataType}</td>
                        <td>{column.pkYn === 'Y' ? <strong className="key-mark">PK</strong> : '-'}</td><td>{column.nullableYn === 'N' ? 'Y' : 'N'}</td><td><code>{column.fk ?? '-'}</code></td>
                        <td><span className={`term-review-status ${column.termStatus.toLowerCase()}`}>{TERM_LABELS[column.termStatus]}</span></td><td>{column.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="table-catalog-empty">조건에 맞는 테이블이 없습니다.</div>}
        </section>
      </div>
    </div>
  );
}
