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
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXCEL_DOWNLOAD: 'EXCEL_DOWNLOAD',
  EXCEL_UPLOAD: 'EXCEL_UPLOAD',
  PRINT: 'PRINT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  MANUAL_VIEW: 'MANUAL_VIEW',
  MANUAL_GENERATE: 'MANUAL_GENERATE',
  MANUAL_EDIT: 'MANUAL_EDIT',
  MANUAL_PUBLISH: 'MANUAL_PUBLISH',
} as const;

export type CommonActionCode =
  (typeof COMMON_ACTIONS)[keyof typeof COMMON_ACTIONS];

/** Product Module은 중앙 목록 수정 없이 Module 전용 Action Code를 선언할 수 있다. */
export type ActionCode = CommonActionCode | (string & {});
