import { useMemo, useState } from 'react';
import { DataTable, PageHeader, SearchPanel } from '../../../components/common';
import type { SearchPanelRows } from '../../../components/common';
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
import {
    initialSearchSampleType1Condition,
    SEARCH_SAMPLE_TYPE_1_PAGE,
    searchSampleType1Columns,
} from './searchSampleType1.config';
import { searchSampleType1Repository } from './searchSampleType1.repository';
import type { SearchSampleType1Condition } from './searchSampleType1.types';

export default function SearchSampleType1Page() {
    const [previewRows, setPreviewRows] = useState<SearchPanelRows>(
        SEARCH_SAMPLE_TYPE_1_PAGE.searchRows,
    );
    const [condition, setCondition] = useState<SearchSampleType1Condition>(
        initialSearchSampleType1Condition,
    );
    const [searchedCondition, setSearchedCondition] =
        useState<SearchSampleType1Condition>(initialSearchSampleType1Condition);

    const searchedRows = useMemo(
        () => searchSampleType1Repository.search(searchedCondition),
        [searchedCondition],
    );

    const updateCondition = <K extends keyof SearchSampleType1Condition>(
        key: K,
        value: SearchSampleType1Condition[K],
    ) => {
        setCondition((currentCondition) => ({
            ...currentCondition,
            [key]: value,
        }));
    };

    const handleReset = () => {
        setCondition(initialSearchSampleType1Condition);
        setSearchedCondition(initialSearchSampleType1Condition);
    };

    return (
        <section className="page">
            <PageHeader
                breadcrumbs={[...SEARCH_SAMPLE_TYPE_1_PAGE.breadcrumbs]}
                description={SEARCH_SAMPLE_TYPE_1_PAGE.description}
            />

            <div className="search-layout-preview" aria-label="검색영역 단수 미리보기">
                <span>검색영역 미리보기</span>
                {([1, 2, 3] as const).map((rows) => (
                    <button
                        key={rows}
                        type="button"
                        className={previewRows === rows ? 'active' : ''}
                        aria-pressed={previewRows === rows}
                        onClick={() => setPreviewRows(rows)}
                    >
                        {rows}단
                    </button>
                ))}
            </div>

            <SearchPanel
                rows={previewRows}
                actions={
                    <>
                        <button
                            type="button"
                            className="secondary-button"
                            data-action-code={COMMON_ACTIONS.RESET}
                            onClick={handleReset}
                        >
                            초기화
                        </button>
                        <button
                            type="button"
                            className="primary-button"
                            data-action-code={COMMON_ACTIONS.SEARCH}
                            onClick={() => setSearchedCondition(condition)}
                        >
                            조회
                        </button>
                    </>
                }
            >
                <label>
                    샘플명
                    <input
                        type="text"
                        value={condition.sampleName}
                        onChange={(event) => updateCondition('sampleName', event.target.value)}
                        placeholder="샘플명을 입력하세요"
                    />
                </label>
                <label>
                    샘플유형
                    <select
                        value={condition.sampleType}
                        onChange={(event) => updateCondition('sampleType', event.target.value)}
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
                            updateCondition('useYn', event.target.value as SearchSampleType1Condition['useYn'])
                        }
                    >
                        <option value="">전체</option>
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                    </select>
                </label>
                {Array.from({ length: previewRows * 4 - 3 }, (_, index) => (
                    <label key={`preview-condition-${index + 1}`}>
                        추가조건 {index + 1}
                        <input
                            type="text"
                            readOnly
                            placeholder="배치 예시"
                            aria-label={`추가조건 ${index + 1} 배치 예시`}
                        />
                    </label>
                ))}
            </SearchPanel>

            <DataTable
                title="조회 결과"
                columns={searchSampleType1Columns}
                rows={searchedRows}
                getRowKey={(row) => row.SAMPLE_ID}
                emptyMessage="조회된 샘플 데이터가 없습니다."
            />
        </section>
    );
}
