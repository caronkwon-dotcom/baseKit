import { useMemo, useState } from 'react';
import {
  PageHeader,
  ProgramDataGrid,
  SearchPanel,
  type DataTableColumn,
  type SearchFieldConfig,
} from '../../../components/common';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { searchSampleType2Repository } from './searchSampleType2.repository';
import type {
  SearchSampleType2Condition,
  SearchSampleType2Row,
} from './searchSampleType2.types';

/**
 * Sample Type 2 복사 후 작업 순서
 *
 * Step 1  Page Context와 PROGRAM_KEY를 변경한다.
 * Step 2  초기 검색조건을 업무 기본값에 맞게 변경한다.
 * Step 3  searchFields에 검색 key/label/controlType/options를 선언한다.
 * Step 4  Grid columns를 업무 Row 타입에 맞게 변경한다.
 * Step 5  types.ts에서 검색조건과 API Row 계약을 변경한다.
 * Step 6  repository.ts의 조회 구현을 업무 API Adapter로 교체한다.
 * Step 7  meta/programs.json, meta/menus.json과 programRegistry를 연결한다.
 * Step 8  조회·초기화·접기, 빈 결과와 긴 검색조건을 화면에서 검수한다.
 *
 * 검색 입력 Control과 검색 Action 버튼 JSX는 직접 작성하지 않는다.
 * SearchPanel 공통 컴포넌트가 fields와 rows를 기준으로 자동 생성한다.
 */

// Step 1. 화면 식별 정보: 메뉴 경로, 개요와 검색영역 기본 단수를 관리한다.
const PAGE_CONFIG = {
  programKey: 'DEV_SEARCH_SAMPLE_TYPE_2',
  breadcrumbs: ['개발자가이드', '화면 샘플', '고급 검색 페이지 샘플 Type 2'],
  description: '3단 검색, 접기·펼치기와 데이터 목록을 검증하는 Page 중심 고급 샘플입니다.',
  searchRows: 3,
} as const;

// Step 2. 화면 최초 진입 및 초기화 시 적용할 검색값을 정의한다.
const initialCondition: SearchSampleType2Condition = {
  requestNo: '',
  requestName: '',
  requestType: '',
  status: '',
  companyName: '',
  departmentName: '',
  requesterName: '',
  priority: '',
  requestedFrom: '',
  requestedTo: '',
  ownerName: '',
  keyword: '',
};

// Step 3. 개발자가 주로 수정하는 검색조건 선언부다. 버튼과 입력 JSX는 작성하지 않는다.
const searchFields: SearchFieldConfig<SearchSampleType2Condition>[] = [
  { key: 'requestNo', label: '요청번호', placeholder: '요청번호' },
  { key: 'requestName', label: '요청명', placeholder: '요청명' },
  {
    key: 'requestType', label: '요청유형', controlType: 'select',
    options: [
      { value: '', label: '전체' }, { value: 'STANDARD', label: '일반' },
      { value: 'URGENT', label: '긴급' }, { value: 'CHANGE', label: '변경' },
    ],
  },
  {
    key: 'status', label: '진행상태', controlType: 'select',
    options: [
      { value: '', label: '전체' }, { value: 'DRAFT', label: '작성중' },
      { value: 'REQUESTED', label: '요청' }, { value: 'IN_PROGRESS', label: '처리중' },
      { value: 'COMPLETED', label: '완료' },
    ],
  },
  { key: 'companyName', label: '회사', placeholder: '회사명' },
  { key: 'departmentName', label: '부서', placeholder: '부서명' },
  { key: 'requesterName', label: '요청자', placeholder: '요청자명' },
  {
    key: 'priority', label: '우선순위', controlType: 'select',
    options: [
      { value: '', label: '전체' }, { value: 'HIGH', label: '높음' },
      { value: 'NORMAL', label: '보통' }, { value: 'LOW', label: '낮음' },
    ],
  },
  { key: 'requestedFrom', label: '요청일 From', controlType: 'date' },
  { key: 'requestedTo', label: '요청일 To', controlType: 'date' },
  { key: 'ownerName', label: '담당자', placeholder: '담당자명' },
  { key: 'keyword', label: '통합검색', placeholder: '요청명/부서/요청자' },
];

const statusLabels = {
  DRAFT: '작성중', REQUESTED: '요청', IN_PROGRESS: '처리중', COMPLETED: '완료',
} as const;
const priorityLabels = { HIGH: '높음', NORMAL: '보통', LOW: '낮음' } as const;

// Step 4. 조회 결과 Grid의 표시 순서와 표현 방식을 정의한다.
const columns: DataTableColumn<SearchSampleType2Row>[] = [
  { key: 'REQUEST_NO', header: '요청번호', render: (row) => row.REQUEST_NO },
  { key: 'REQUEST_NAME', header: '요청명', render: (row) => row.REQUEST_NAME },
  { key: 'REQUEST_TYPE', header: '유형', render: (row) => row.REQUEST_TYPE },
  { key: 'STATUS', header: '진행상태', render: (row) => statusLabels[row.STATUS] },
  { key: 'COMPANY_NAME', header: '회사', render: (row) => row.COMPANY_NAME },
  { key: 'DEPARTMENT_NAME', header: '부서', render: (row) => row.DEPARTMENT_NAME },
  { key: 'REQUESTER_NAME', header: '요청자', render: (row) => row.REQUESTER_NAME },
  { key: 'PRIORITY', header: '우선순위', render: (row) => priorityLabels[row.PRIORITY] },
  { key: 'OWNER_NAME', header: '담당자', render: (row) => row.OWNER_NAME },
  { key: 'REQUESTED_AT', header: '요청일', render: (row) => row.REQUESTED_AT },
  { key: 'EXPECTED_AT', header: '완료예정일', render: (row) => row.EXPECTED_AT },
  { key: 'MOD_BY', header: '최종수정자', render: (row) => row.MOD_BY },
  { key: 'MOD_DT', header: '최종수정일시', render: (row) => row.MOD_DT },
  { key: 'REMARK', header: '비고', render: (row) => row.REMARK },
];

export default function SearchSampleType2Page() {
  // Step 5. 입력 중인 조건과 조회가 확정된 조건을 분리한다.
  const [condition, setCondition] = useState(initialCondition);
  const [searchedCondition, setSearchedCondition] = useState(initialCondition);

  // Step 6. Repository 경계를 통해 조회한다. REST 전환 시 Page 구조는 유지한다.
  const rows = useMemo(
    () => searchSampleType2Repository.search(searchedCondition),
    [searchedCondition],
  );
  const completedCount = rows.filter((row) => row.STATUS === 'COMPLETED').length;
  const highPriorityCount = rows.filter((row) => row.PRIORITY === 'HIGH').length;

  // Step 7. Page는 상태 연결만 담당하며 검색 Control과 Action UI는 SearchPanel이 만든다.
  const handleReset = (nextCondition: SearchSampleType2Condition) => {
    setSearchedCondition(nextCondition);
  };

  // Step 8. 공통 블록을 업무 흐름 순서대로 조립한다.
  return (
    <section className="page">
      <PageHeader
        breadcrumbs={[...PAGE_CONFIG.breadcrumbs]}
        description={PAGE_CONFIG.description}
      />

      <SearchPanel
        rows={PAGE_CONFIG.searchRows}
        fields={searchFields}
        value={condition}
        initialValue={initialCondition}
        onValueChange={setCondition}
        onSearch={setSearchedCondition}
        onReset={handleReset}
      />

      <ProgramDataGrid
        programKey={PAGE_CONFIG.programKey}
        roleCode="ADMIN"
        title="업무 요청 목록"
        metrics={[
          { label: '완료', value: completedCount, tone: 'accent' },
          { label: '긴급', value: highPriorityCount, tone: 'danger' },
        ]}
        actionHandlers={{
          [COMMON_ACTIONS.CREATE]: () => undefined,
          [COMMON_ACTIONS.DELETE]: ({ selectedRows }) => {
            if (selectedRows.length === 0) return;
          },
          [COMMON_ACTIONS.EXCEL_DOWNLOAD]: () => undefined,
        }}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.REQUEST_NO}
        emptyMessage="검색조건에 해당하는 업무 요청이 없습니다."
        scrollSample
      />
    </section>
  );
}
