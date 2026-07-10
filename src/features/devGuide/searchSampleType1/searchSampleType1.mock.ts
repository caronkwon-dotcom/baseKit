/**
 * Step 2: Mock 데이터 정의
 *
 * API 연동 전 화면 동작을 확인하기 위한 샘플 목록 데이터
 * 실제 업무 데이터가 아니라 Search Page 개발 패턴 확인용 데이터
 */

import type { SearchSampleType1Row } from "./searchSampleType1.types.ts";

export const searchSampleTypeRows : SearchSampleType1Row[] = [
    {
        SAMPLE_ID: 'SAMPLE-001',
        SAMPLE_NAME: '샘플 데이터 1',
        SAMPLE_TYPE: 'TYPE_A',
        USE_YN: 'Y',
        CREATED_AT: '2026-07-09T10:00:00',
    },
    {
        SAMPLE_ID: 'SAMPLE-002',
        SAMPLE_NAME: '샘플 데이터 2',
        SAMPLE_TYPE: 'TYPE_B',
        USE_YN: 'Y',
        CREATED_AT: '2026-07-09T11:00:00',
    },
    {
        SAMPLE_ID: 'SAMPLE-003',
        SAMPLE_NAME: '샘플 데이터 3',
        SAMPLE_TYPE: 'TYPE_A',
        USE_YN: 'N',
        CREATED_AT: '2026-07-09T12:00:00',
    },
];