/**
 * Step 1 : 데이터 타입 정의
 *
 * 기본 검색 페이지 샘플 Type 1에서 사용할 목록 데이터 구조
 * 검색조건 1단 + 데이터 목록 화면의 가장 단순한 표준 샘플
 */
export interface SearchSampleType1Row {
    SAMPLE_ID   : string;
    SAMPLE_NAME : string;
    SAMPLE_TYPE : string;
    USE_YN      : 'Y' | 'N';
    CREATED_AT  : string;
}

export interface SearchSampleType1Condition {
    sampleName: string;
    sampleType: string;
    useYn: '' | 'Y' | 'N';
}
