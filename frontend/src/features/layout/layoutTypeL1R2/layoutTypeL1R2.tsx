/**
 * Layout Type L1R2
 *
 * 목적:
 * - Left 1 Grid + Right Top/Bottom 2 Grid 표준 레이아웃 예제
 * - 실제 업무 API 없이 Mock Data로 화면 구조만 설명
 *
 * 표준 참고 화면:
 * - src/pages/CodeManagePage.tsx
 *
 * 필요 시 확장:
 * - 메시지 영역        → BaseKitMessage
 * - Grid 변경상태 관리 → useGridRowState
 * - 저장 전 검증       → gridFieldValidation
 * - Backend 연동      → 업무별 service/api
 *
 * 주의:
 * - 레이아웃 비율을 화면에서 직접 CSS로 구현하지 않는다.
 * - MasterDetailMultiGrid 공통 컴포넌트를 사용한다.
 */

import { useCallback, useEffect, useState } from 'react';
import {MasterDetailMultiGrid, PageHeader, SearchPanel, type DataTableColumn, type SearchFieldConfig,} from '../../../components/common';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import BaseKitDataGrid from '../../../components/grid/BaseKitDataGrid';
import { useGridRowState } from '../../../components/grid/gridRowState';

/* =================Search Area - Start============================ */
// [SAMPLE] 레이아웃 샘플에서 사용할 최소 검색조건.
// 실제 업무화면에서는 업무 요구사항에 맞게 필드를 교체한다.
interface SearchCondition {
    keyword: string;
    useYn: '' | 'Y' | 'N';
}

// [SAMPLE] 검색조건 초기값.
const initialSearchCondition: SearchCondition = {
    keyword: '',
    useYn: '',
};

// [STANDARD] BaseKit 공통 검색영역은 SearchPanel을 사용한다.
// [EXTENSION] 실제 업무에서는 검색조건을 API 조회 파라미터로 연결한다.
const searchFields: SearchFieldConfig<SearchCondition>[] = [
    {
        key: 'keyword',
        label: '검색어',
        placeholder: 'ID 또는 명칭',
    },
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
/* =================Search Area - End============================== */

/* =================Left Grid Area - Start========================= */

// [SAMPLE] Left Grid에서 사용할 샘플 데이터 구조.
// 실제 업무화면에서는 업무 Entity/DTO 타입으로 교체한다.
interface LeftGridRow {
    MASTER_ID: string;
    MASTER_NAME: string;
    DESCRIPTION: string;
    USE_YN: 'Y' | 'N';
}

// [SAMPLE] DB/API 없이 Layout 확인을 위한 Mock Data.
const leftGridRows: LeftGridRow[] = [{MASTER_ID: 'M001', MASTER_NAME: 'Master 01', DESCRIPTION: '첫 번째 Master 데이터', USE_YN: 'Y',}, {MASTER_ID: 'M002', MASTER_NAME: 'Master 02', DESCRIPTION: '두 번째 Master 데이터', USE_YN: 'Y',}, {MASTER_ID: 'M003', MASTER_NAME: 'Master 03', DESCRIPTION: '세 번째 Master 데이터', USE_YN: 'N',},];

// [STANDARD] BaseKitDataGrid에 전달할 Column 정의.
// width는 고정폭, flex는 남은 영역을 비율로 사용한다.
const leftGridColumns: DataTableColumn<LeftGridRow>[] = [
    {key: 'MASTER_ID',      header: 'Master ID',    width: 120, render: row => row.MASTER_ID,},
    {key: 'MASTER_NAME',    header: 'Master 명',     width: 140, render: row => row.MASTER_NAME,},
    {key: 'DESCRIPTION',    header: '설명',           flex: 1,    render: row => row.DESCRIPTION,},
    {key: 'USE_YN',         header: '사용',           width: 60, render: row => row.USE_YN,},
];

/* =================Left Grid Area - End=========================== */

/* =================Right Top Grid Area - Start==================== */

// [SAMPLE] Right Top Grid에서 사용할 Detail 데이터 구조.
// MASTER_ID는 Left Grid와의 연결 기준값이다.
interface RightTopGridRow {
    DETAIL_TOP_ID:   string;
    MASTER_ID:       string;
    DETAIL_TOP_NAME: string;
    SORT_ORDER:      number;
    USE_YN:          'Y' | 'N';
}

// [SAMPLE] Left Grid의 MASTER_ID와 연결되는 Mock Data.
const rightTopGridRows: RightTopGridRow[] = [
    { DETAIL_TOP_ID: 'T001', MASTER_ID: 'M001', DETAIL_TOP_NAME: 'Top Detail 01', SORT_ORDER: 1, USE_YN: 'Y' },
    { DETAIL_TOP_ID: 'T002', MASTER_ID: 'M001', DETAIL_TOP_NAME: 'Top Detail 02', SORT_ORDER: 2, USE_YN: 'Y' },
    { DETAIL_TOP_ID: 'T003', MASTER_ID: 'M002', DETAIL_TOP_NAME: 'Top Detail 03', SORT_ORDER: 1, USE_YN: 'Y' },
    { DETAIL_TOP_ID: 'T004', MASTER_ID: 'M003', DETAIL_TOP_NAME: 'Top Detail 04', SORT_ORDER: 1, USE_YN: 'N' },
];

// [STANDARD] BaseKitDataGrid에 전달할 Column 정의.
const rightTopGridColumns: DataTableColumn<RightTopGridRow>[] = [
    { key: 'DETAIL_TOP_ID',   header: 'Detail ID',   width: 120, render: row => row.DETAIL_TOP_ID },
    { key: 'DETAIL_TOP_NAME', header: 'Detail 명',    flex: 1,    render: row => row.DETAIL_TOP_NAME },
    { key: 'SORT_ORDER',      header: '정렬',         width: 60,  render: row => row.SORT_ORDER },
    { key: 'USE_YN',          header: '사용',         width: 60,  render: row => row.USE_YN },
];

/* =================Right Top Grid Area - End====================== */

/* =================Right Bottom Grid Area - Start================= */

// [SAMPLE] Right Bottom Grid에서 사용할 Detail 데이터 구조.
// MASTER_ID는 Left Grid와의 연결 기준값이다.
interface RightBottomGridRow {
    DETAIL_BOTTOM_ID:   string;
    MASTER_ID:          string;
    DETAIL_BOTTOM_NAME: string;
    VALUE:              string;
    USE_YN:             'Y' | 'N';
}

// [SAMPLE] Left Grid의 MASTER_ID와 연결되는 Mock Data.
const rightBottomGridRows: RightBottomGridRow[] = [
    { DETAIL_BOTTOM_ID: 'B001', MASTER_ID: 'M001', DETAIL_BOTTOM_NAME: 'Bottom Detail 01', VALUE: 'Value 01', USE_YN: 'Y' },
    { DETAIL_BOTTOM_ID: 'B002', MASTER_ID: 'M001', DETAIL_BOTTOM_NAME: 'Bottom Detail 02', VALUE: 'Value 02', USE_YN: 'Y' },
    { DETAIL_BOTTOM_ID: 'B003', MASTER_ID: 'M002', DETAIL_BOTTOM_NAME: 'Bottom Detail 03', VALUE: 'Value 03', USE_YN: 'Y' },
    { DETAIL_BOTTOM_ID: 'B004', MASTER_ID: 'M003', DETAIL_BOTTOM_NAME: 'Bottom Detail 04', VALUE: 'Value 04', USE_YN: 'N' },
];

// [STANDARD] BaseKitDataGrid에 전달할 Column 정의.
const rightBottomGridColumns: DataTableColumn<RightBottomGridRow>[] = [
    { key: 'DETAIL_BOTTOM_ID',   header: 'Detail ID', width: 120, render: row => row.DETAIL_BOTTOM_ID },
    { key: 'DETAIL_BOTTOM_NAME', header: 'Detail 명',  flex: 1,    render: row => row.DETAIL_BOTTOM_NAME },
    { key: 'VALUE',              header: '값',         width: 120, render: row => row.VALUE },
    { key: 'USE_YN',             header: '사용',       width: 60,  render: row => row.USE_YN },
];

/* =================Right Bottom Grid Area - End=================== */

export default function LayoutTypeL1R2() {

    /* =================State Area - Start============================= */


    // [STANDARD] 검색조건은 SearchPanel과 연결되는 화면 상태로 관리한다.
    const [searchCondition, setSearchCondition] =
        useState<SearchCondition>(initialSearchCondition);

    // [STANDARD] Left Grid에서 현재 선택된 Master의 Key를 관리한다.
    // Right Top / Bottom Grid는 이 Key를 기준으로 Detail 데이터를 조회하거나 필터링한다.
    const [selectedMasterId, setSelectedMasterId] =
        useState(leftGridRows[0]?.MASTER_ID ?? '');
    const [selectedLeftRowKeys, setSelectedLeftRowKeys] = useState<Set<string>>(new Set());

    // [SAMPLE] Left Grid Mock Data를 행추가/행삭제 테스트용 상태로 관리한다.
    //const [leftRows, setLeftRows] = useState<LeftGridRow[]>(leftGridRows);

    // [SAMPLE] 실제 업무화면에서는 API 조회 결과로 교체한다.
    // 현재 샘플에서는 선택된 Master ID 기준으로 Mock Data를 필터링한다.
    const filteredRightTopRows = rightTopGridRows.filter(
        row => row.MASTER_ID === selectedMasterId,
    );

    const filteredRightBottomRows = rightBottomGridRows.filter(
        row => row.MASTER_ID === selectedMasterId,
    );

    const getMasterRowKey = useCallback((row: LeftGridRow) => row.MASTER_ID, []);
    const leftGrid = useGridRowState<LeftGridRow>(getMasterRowKey);
    const replaceLeftGridRows = leftGrid.replace;

    useEffect(() => {
        replaceLeftGridRows(leftGridRows);
    }, [replaceLeftGridRows]);

    /* =================State Area - End=============================== */


    /* =================Event Area - Start============================= */

    // [SAMPLE] 검색 버튼 클릭 시 실행.
    // 실제 업무화면에서는 이 위치에서 API 조회를 수행한다.
    const handleSearch = (condition: SearchCondition) => {
        setSearchCondition(condition);
    };

    const handleReset = (condition: SearchCondition) => {
        setSearchCondition(condition);
    };

    // [STANDARD] 검색조건 초기화.
    // SearchPanel에서 전달받은 초기값으로 상태를 되돌린다.
    const handleLeftRowClick = (row: LeftGridRow) => {
        setSelectedMasterId(row.MASTER_ID);
    };

    const handleLeftAdd = () => {
        leftGrid.add({
            MASTER_ID: '',
            MASTER_NAME: '',
            DESCRIPTION: '',
            USE_YN: 'Y',
        });
    };


    /* =================Event Area - End=============================== */

    /* =================Render Area - Start============================ */

    return (
        <section className="page multi-grid-page">
            <PageHeader
                breadcrumbs={['개발가이드', 'Layout Type L1R2']}
                description="Left 1 Grid + Right Top/Bottom 2 Grid 표준 레이아웃 샘플입니다."
            />

            <SearchPanel
                rows={1}
                fields={searchFields}
                value={searchCondition}
                initialValue={initialSearchCondition}
                onValueChange={setSearchCondition}
                onSearch={handleSearch}
                onReset={handleReset}
            />

            <MasterDetailMultiGrid
                master={
                    <BaseKitDataGrid
                        programKey="LYT_L1R2"
                        roleCode="ADMIN"
                        title="Left Master"
                        columns={leftGridColumns}
                        rows={leftGrid.rows}
                        getRowKey={(row) => row.__GRID_ROW_ID}
                        selectedRowKeys={selectedLeftRowKeys}
                        onSelectedRowKeysChange={setSelectedLeftRowKeys}
                        getRowState={leftGrid.getState}
                        currentRowKey={
                            leftGrid.rows.find((row) => row.MASTER_ID === selectedMasterId)?.__GRID_ROW_ID
                        }
                        onRowClick={handleLeftRowClick}
                        toolbarActions={[
                            { actionCode: COMMON_ACTIONS.CREATE, label: '추가', onClick: handleLeftAdd },
                            {
                                actionCode: COMMON_ACTIONS.DELETE,
                                label: '삭제',
                                disabled: selectedLeftRowKeys.size === 0,
                                onClick: () => {
                                    leftGrid.remove(selectedLeftRowKeys);
                                    setSelectedLeftRowKeys(new Set());
                                },
                            },
                        ]}
                    />
                }

                detailTop={
                    <BaseKitDataGrid
                        programKey="LYT_L1R2"
                        roleCode="ADMIN"
                        title="Right Top Detail"
                        columns={rightTopGridColumns}
                        rows={filteredRightTopRows}
                        getRowKey={row => row.DETAIL_TOP_ID}
                        enabledActions={[]}
                    />
                }

                detailBottom={
                    <BaseKitDataGrid
                        programKey="LYT_L1R2"
                        roleCode="ADMIN"
                        title="Right Bottom Detail"
                        columns={rightBottomGridColumns}
                        rows={filteredRightBottomRows}
                        getRowKey={row => row.DETAIL_BOTTOM_ID}
                        enabledActions={[]}
                    />
                }
            />
        </section>
    );

    /* =================Render Area - End============================== */
}



