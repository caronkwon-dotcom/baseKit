import { useMemo, useState } from 'react';
import { DataTable, PageHeader, SearchPanel } from '../../../components/common';
import type { SearchPanelRows } from '../../../components/common';
import type { SearchFieldConfig } from '../../../components/common';
import {
    initialSearchSampleType1Condition,
    SEARCH_SAMPLE_TYPE_1_PAGE,
    searchSampleType1Columns,
    searchSampleType1Fields,
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
    const previewFields = useMemo<SearchFieldConfig<SearchSampleType1Condition>[]>(
        () => [
            ...searchSampleType1Fields,
            ...Array.from({ length: previewRows * 4 - searchSampleType1Fields.length }, (_, index) => ({
                key: `previewCondition${index + 1}` as keyof SearchSampleType1Condition,
                label: `추가조건 ${index + 1}`,
                placeholder: '배치 예시',
            })),
        ],
        [previewRows],
    );

    return (
        <section className="page">
            <PageHeader
                breadcrumbs={[...SEARCH_SAMPLE_TYPE_1_PAGE.breadcrumbs]}
                description={SEARCH_SAMPLE_TYPE_1_PAGE.description}
            />

            <div className="search-layout-preview" aria-label="검색영역 단수 미리보기">
                <span>검색영역 미리보기</span>
                {([1, 2, 3, 4, 5] as const).map((rows) => (
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
                fields={previewFields}
                value={condition}
                initialValue={initialSearchSampleType1Condition}
                onValueChange={setCondition}
                onSearch={setSearchedCondition}
                onReset={setSearchedCondition}
            />

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
