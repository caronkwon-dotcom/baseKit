import { useState } from 'react';
import DataTable, {
  type DataTableColumn,
} from '../components/common/DataTable';
import PageHeader from '../components/common/PageHeader';
import SearchPanel, { type SearchFieldConfig } from '../components/common/SearchPanel';
import SummaryCard from '../components/common/SummaryCard';
import { codeGroups } from '../mock/codeGroups';
import { codes } from '../mock/codes';
import type { Code, CodeGroup } from '../types';

interface CodeSearchCondition {
  codeGroup: string;
  codeName: string;
  useYn: '' | 'Y' | 'N';
}

const initialCodeSearchCondition: CodeSearchCondition = {
  codeGroup: '',
  codeName: '',
  useYn: '',
};

const codeSearchFields: SearchFieldConfig<CodeSearchCondition>[] = [
  { key: 'codeGroup', label: '코드그룹', placeholder: '코드그룹' },
  { key: 'codeName', label: '코드명', placeholder: '코드명' },
  {
    key: 'useYn',
    label: '사용 여부',
    controlType: 'select',
    options: [
      { value: '', label: '전체' },
      { value: 'Y', label: '사용' },
      { value: 'N', label: '미사용' },
    ],
  },
];

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
  const [condition, setCondition] = useState(initialCodeSearchCondition);

  return (
    <section className="page">
      <PageHeader
        breadcrumbs={['시스템관리', '공통코드관리']}
        description="시스템 공통 코드와 코드 그룹을 관리합니다."
      />

      <SearchPanel
        rows={1}
        fields={codeSearchFields}
        value={condition}
        initialValue={initialCodeSearchCondition}
        onValueChange={setCondition}
        onSearch={setCondition}
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
