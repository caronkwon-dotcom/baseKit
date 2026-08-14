import type { DataTableColumn, SearchFieldConfig } from '../../../components/common';
import type {
    SearchSampleType1Condition,
    SearchSampleType1Row,
} from './searchSampleType1.types';

export const SEARCH_SAMPLE_TYPE_1_PAGE = {
    programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
    breadcrumbs: ['개발자가이드', '화면 샘플', '기본 검색 페이지 샘플'],
    description: '검색조건 1단과 데이터 목록으로 구성된 기본 Search Page 샘플입니다.',
    searchRows: 1,
} as const;

export const initialSearchSampleType1Condition: SearchSampleType1Condition = {
    sampleName: '',
    sampleType: '',
    useYn: '',
};

export const searchSampleType1Fields: SearchFieldConfig<SearchSampleType1Condition>[] = [
    { key: 'sampleName', label: '샘플명', placeholder: '샘플명을 입력하세요' },
    {
        key: 'sampleType',
        label: '샘플유형',
        controlType: 'select',
        options: [
            { value: '', label: '전체' },
            { value: 'TYPE_A', label: 'TYPE_A' },
            { value: 'TYPE_B', label: 'TYPE_B' },
        ],
    },
    {
        key: 'useYn',
        label: '사용여부',
        controlType: 'select',
        options: [
            { value: '', label: '전체' },
            { value: 'Y', label: '사용' },
            { value: 'N', label: '미사용' },
        ],
    },
];

export const searchSampleType1Columns: DataTableColumn<SearchSampleType1Row>[] = [
    { key: 'SAMPLE_ID', header: '샘플 ID', render: (row) => row.SAMPLE_ID },
    { key: 'SAMPLE_NAME', header: '샘플명', render: (row) => row.SAMPLE_NAME },
    { key: 'SAMPLE_TYPE', header: '샘플유형', render: (row) => row.SAMPLE_TYPE },
    { key: 'USE_YN', header: '사용여부', render: (row) => row.USE_YN },
    { key: 'CREATED_AT', header: '등록일시', render: (row) => row.CREATED_AT },
];
