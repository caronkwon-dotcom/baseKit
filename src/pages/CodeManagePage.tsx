import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import { codeGroups } from '../mock/codeGroups';
import { codes } from '../mock/codes';
import type { Code, CodeGroup } from '../types';

const codeGroupColumns: DataTableColumn<CodeGroup>[] = [
  {
    key: 'CODE_GROUP_ID',
    header: '그룹ID',
    render: (group) => group.CODE_GROUP_ID,
  },
  {
    key: 'CODE_GROUP_NAME',
    header: '그룹명',
    render: (group) => group.CODE_GROUP_NAME,
  },
  {
    key: 'DESCRIPTION',
    header: '설명',
    render: (group) => group.DESCRIPTION,
  },
  {
    key: 'USE_YN',
    header: '사용여부',
    render: (group) => group.USE_YN,
  },
];

const codeColumns: DataTableColumn<Code>[] = [
  {
    key: 'CODE_GROUP_ID',
    header: '그룹ID',
    render: (code) => code.CODE_GROUP_ID,
  },
  {
    key: 'CODE_ID',
    header: '코드ID',
    render: (code) => code.CODE_ID,
  },
  {
    key: 'CODE_NAME',
    header: '코드명',
    render: (code) => code.CODE_NAME,
  },
  {
    key: 'SORT_ORDER',
    header: '정렬',
    render: (code) => code.SORT_ORDER,
  },
  {
    key: 'USE_YN',
    header: '사용여부',
    render: (code) => code.USE_YN,
  },
];

export default function CodeManagePage() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="System"
        title="공통코드관리"
        description="시스템 공통 코드와 코드 그룹을 관리합니다."
      />

      <div className="summary-grid">
        <SummaryCard label="코드그룹" value={codeGroups.length} />
        <SummaryCard label="공통코드" value={codes.length} />
      </div>

      <DataTable
        title="코드그룹"
        columns={codeGroupColumns}
        rows={codeGroups}
        getRowKey={(group) => group.CODE_GROUP_ID}
      />

      <DataTable
        title="공통코드"
        columns={codeColumns}
        rows={codes}
        getRowKey={(code) => `${code.CODE_GROUP_ID}-${code.CODE_ID}`}
      />
    </section>
  );
}
