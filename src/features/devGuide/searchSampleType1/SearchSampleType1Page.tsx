import { useMemo, useState } from 'react';
import { PageHeader , SearchPanel, DataTable } from '../../../components/common';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import { searchSampleTypeRows } from './searchSampleType1.mock';

import type { SearchSampleType1Row } from './searchSampleType1.types';

/*
 * Step 9-1-0: 페이지 설정
 *
 * 화면의 기본 정보를 한곳에서 관리한다.
 * programKey는 메뉴, 권한, 로그, 라이선스와 연결될 기준 키이다.
 */
const PAGE_CONFIG = {
    programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
    title: '기본 검색 페이지 샘플 Type 1',
    description:
        '검색조건 1단 + 데이터 목록으로 구성된 가장 기본적인 Search Page 샘플입니다.',
} as const;

/*
 * Step 9-2: 검색조건 타입 정의
 *
 * 화면에서 사용하는 검색조건 상태 타입이다.
 * React 화면 상태값은 camelCase를 사용한다.
 */
type SearchCondition = {
    sampleName: string;
    sampleType: string;
    useYn: string;
};

/*
 * Step 9-3: 초기 검색조건 값
 *
 * 화면 최초 진입 시 적용되는 기본 검색조건이다.
 * 빈 문자열('')은 전체 조건을 의미한다.
 */
const initialCondition: SearchCondition = {
    sampleName: '',
    sampleType: '',
    useYn: '',
};

/*
 * Step 9-4: 목록 컬럼 정의
 *
 * DataTable에 표시할 컬럼 목록이다.
 * key는 row 데이터 필드명과 동일하게 맞춘다.
 * 현재 row 데이터는 DB/API 기준을 따라 SNAKE_UPPER를 사용한다.
 */
const columns = [
    {
        key: 'SAMPLE_ID',
        header: '샘플 ID',
        render: (row: SearchSampleType1Row) => row.SAMPLE_ID,
    },
    {
        key: 'SAMPLE_NAME',
        header: '샘플명',
        render: (row: SearchSampleType1Row) => row.SAMPLE_NAME,
    },
    {
        key: 'SAMPLE_TYPE',
        header: '샘플유형',
        render: (row: SearchSampleType1Row) => row.SAMPLE_TYPE,
    },
    {
        key: 'USE_YN',
        header: '사용여부',
        render: (row: SearchSampleType1Row) => row.USE_YN,
    },
    {
        key: 'CREATED_AT',
        header: '등록일시',
        render: (row: SearchSampleType1Row) => row.CREATED_AT,
    },
];

/*
 * Step 9-5: mock 데이터 조회 함수
 *
 * 현재는 DB/API 연동 전 단계이므로 mock 데이터를 화면에서 조회한다.
 * 실제 API 연동 후에는 이 함수 대신 service 호출로 대체한다.
 *
 * 주의:
 * - 이 함수는 그리드 필터 기능이 아니다.
 * - 서버 검색조건과 그리드 자체 필터는 분리해서 관리한다.
 */
function searchMockRows(
    rows: SearchSampleType1Row[],
    condition: SearchCondition,
): SearchSampleType1Row[] {
    return rows.filter((row) => {
        const matchesSampleName =
            condition.sampleName === '' ||
            row.SAMPLE_NAME.includes(condition.sampleName);

        const matchesSampleType =
            condition.sampleType === '' || row.SAMPLE_TYPE === condition.sampleType;

        const matchesUseYn =
            condition.useYn === '' || row.USE_YN === condition.useYn;

        return matchesSampleName && matchesSampleType && matchesUseYn;
    });
}

/*
 * Step 9-6: 기본 검색 페이지 컴포넌트
 *
 * condition:
 * - 사용자가 현재 입력 중인 검색조건
 *
 * searchedCondition:
 * - 조회 버튼을 눌렀을 때 확정된 검색조건
 *
 * searchedRows:
 * - 확정된 검색조건 기준으로 조회된 목록
 */
export default function SearchSampleType1Page() {
    const [condition, setCondition] =
        useState<SearchCondition>(initialCondition);

    const [searchedCondition, setSearchedCondition] =
        useState<SearchCondition>(initialCondition);

    const searchedRows = useMemo(
        () => searchMockRows(searchSampleTypeRows, searchedCondition),
        [searchedCondition],
    );

    /*
     * Step 9-7-0: 검색조건 변경 함수
     *
     * 검색조건 input/select 값이 변경될 때 condition 상태를 갱신한다.
     * key는 SearchCondition의 필드명만 허용한다.
     */
    const updateCondition = (
        key: keyof SearchCondition,
        value: string,
    ) => {
        setCondition((currentCondition) => ({
            ...currentCondition,
            [key]: value,
        }));
    };

    /*
     * Step 9-7-1: 조회 이벤트
     *
     * 현재 입력 중인 condition을 searchedCondition으로 확정한다.
     * 실제 API 연동 후에는 이 위치에서 service 조회를 호출한다.
     */
    const handleSearch = () => {
        setSearchedCondition(condition);
    };

    /*
     * Step 9-7-2: 초기화 이벤트
     *
     * 입력 중인 검색조건과 조회 확정 조건을 모두 초기값으로 되돌린다.
     */
    const handleReset = () => {
        setCondition(initialCondition);
        setSearchedCondition(initialCondition);
    };

    return (
        <section className="page">
            {/*
       * Step 9-8-0: PageHeader 구성
       *
       * 화면 제목, 설명, 상단 버튼을 표시한다.
       * 버튼은 COMMON_ACTIONS 기준으로 정의하여 추후 권한/로그/라이선스와 연결할 수 있게 한다.
       */}
            <PageHeader
                title={PAGE_CONFIG.title}
                description={PAGE_CONFIG.description}
            />
            {/*
       * Step 9-8-1: SearchPanel 구성
       *
       * 서버 조회 조건으로 사용할 검색 입력 영역이다.
       * 모든 컬럼을 검색조건으로 만들지 않고,
       * 업무적으로 의미 있는 조건만 배치한다.
       */}
            <SearchPanel
                title="검색조건"
                actions={
                    <>
                        <button type="button" data-action-code={COMMON_ACTIONS.SEARCH} onClick={handleSearch}>
                            조회
                        </button>
                        <button type="button" data-action-code={COMMON_ACTIONS.RESET} onClick={handleReset}>
                            초기화
                        </button>
                    </>
                }
            >
                <label>
                    샘플명
                    <input
                        type="text"
                        value={condition.sampleName}
                        onChange={(event) =>
                            updateCondition('sampleName', event.target.value)
                        }
                        placeholder="샘플명을 입력하세요"
                    />
                </label>

                <label>
                    샘플유형
                    <select
                        value={condition.sampleType}
                        onChange={(event) =>
                            updateCondition('sampleType', event.target.value)
                        }
                    >
                        <option value="">전체</option>
                        <option value="TYPE_A">TYPE_A</option>
                        <option value="TYPE_B">TYPE_B</option>
                    </select>
                </label>

                <label>
                    사용여부
                    <select
                        value={condition.useYn}
                        onChange={(event) =>
                            updateCondition('useYn', event.target.value)
                        }
                    >
                        <option value="">전체</option>
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                    </select>
                </label>
            </SearchPanel>
            {/*
       * Step 9-8-2: DataTable 목록 구성
       *
       * 조회 결과 목록을 표시한다.
       * columns는 화면 상단에서 정의한 표준 컬럼 설정을 사용한다.
       * rows는 조회 버튼을 눌러 확정된 검색조건 기준의 결과 목록이다.
       */}
            <DataTable<SearchSampleType1Row>
                title="조회 결과"
                columns={columns}
                rows={searchedRows}
                getRowKey={(row) => row.SAMPLE_ID}
                emptyMessage="조회된 샘플 데이터가 없습니다."
            />
        </section>
    );
}