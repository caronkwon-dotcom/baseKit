/*
 * 공통 Action Code
 *
 * 여러 화면에서 반복적으로 사용하는 표준 버튼 코드이다.
 * 권한, 로그, 라이선스 체크의 기준 코드로 사용한다.
 */
export const COMMON_ACTIONS = {
    SEARCH: 'SEARCH',
    RESET: 'RESET',
    CREATE: 'CREATE',
    SAVE: 'SAVE',
    DELETE: 'DELETE',
    EXCEL_DOWNLOAD: 'EXCEL_DOWNLOAD',
    PRINT: 'PRINT',
} as const;

export type CommonActionCode =
    (typeof COMMON_ACTIONS)[keyof typeof COMMON_ACTIONS];