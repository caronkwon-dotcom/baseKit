import type { SearchSampleType2Row } from './searchSampleType2.types';

const baseRows = [
  { REQUEST_NO: 'REQ-2026-001', REQUEST_NAME: '신규 사용자 계정 발급', REQUEST_TYPE: 'STANDARD', STATUS: 'COMPLETED', COMPANY_NAME: 'BaseKit 본사', DEPARTMENT_NAME: '경영지원팀', REQUESTER_NAME: '김하늘', PRIORITY: 'NORMAL', OWNER_NAME: '이운영', REQUESTED_AT: '2026-07-01' },
  { REQUEST_NO: 'REQ-2026-002', REQUEST_NAME: '월 마감 권한 긴급 부여', REQUEST_TYPE: 'URGENT', STATUS: 'IN_PROGRESS', COMPANY_NAME: 'BaseKit 본사', DEPARTMENT_NAME: '재무팀', REQUESTER_NAME: '박정산', PRIORITY: 'HIGH', OWNER_NAME: '최관리', REQUESTED_AT: '2026-07-03' },
  { REQUEST_NO: 'REQ-2026-003', REQUEST_NAME: '메뉴 구조 변경 요청', REQUEST_TYPE: 'CHANGE', STATUS: 'REQUESTED', COMPANY_NAME: 'BaseKit 연구소', DEPARTMENT_NAME: '플랫폼개발팀', REQUESTER_NAME: '윤개발', PRIORITY: 'NORMAL', OWNER_NAME: '이운영', REQUESTED_AT: '2026-07-05' },
  { REQUEST_NO: 'REQ-2026-004', REQUEST_NAME: '퇴직자 계정 잠금', REQUEST_TYPE: 'URGENT', STATUS: 'COMPLETED', COMPANY_NAME: 'BaseKit 물류', DEPARTMENT_NAME: '물류운영팀', REQUESTER_NAME: '정물류', PRIORITY: 'HIGH', OWNER_NAME: '최관리', REQUESTED_AT: '2026-07-08' },
  { REQUEST_NO: 'REQ-2026-005', REQUEST_NAME: '공통코드 신규 등록', REQUEST_TYPE: 'STANDARD', STATUS: 'DRAFT', COMPANY_NAME: 'BaseKit 본사', DEPARTMENT_NAME: '기준정보팀', REQUESTER_NAME: '한기준', PRIORITY: 'LOW', OWNER_NAME: '이운영', REQUESTED_AT: '2026-07-11' },
  { REQUEST_NO: 'REQ-2026-006', REQUEST_NAME: '결재선 변경 적용', REQUEST_TYPE: 'CHANGE', STATUS: 'IN_PROGRESS', COMPANY_NAME: 'BaseKit 연구소', DEPARTMENT_NAME: '품질관리팀', REQUESTER_NAME: '오품질', PRIORITY: 'NORMAL', OWNER_NAME: '최관리', REQUESTED_AT: '2026-07-13' },
  { REQUEST_NO: 'REQ-2026-007', REQUEST_NAME: '협력사 사용자 일괄 등록', REQUEST_TYPE: 'STANDARD', STATUS: 'REQUESTED', COMPANY_NAME: 'BaseKit 물류', DEPARTMENT_NAME: '협력사지원팀', REQUESTER_NAME: '임지원', PRIORITY: 'NORMAL', OWNER_NAME: '이운영', REQUESTED_AT: '2026-07-15' },
  { REQUEST_NO: 'REQ-2026-008', REQUEST_NAME: '시스템 설정값 변경', REQUEST_TYPE: 'CHANGE', STATUS: 'COMPLETED', COMPANY_NAME: 'BaseKit 본사', DEPARTMENT_NAME: '시스템운영팀', REQUESTER_NAME: '서시스템', PRIORITY: 'HIGH', OWNER_NAME: '최관리', REQUESTED_AT: '2026-07-18' },
] satisfies Omit<SearchSampleType2Row, 'EXPECTED_AT' | 'UPDATED_BY' | 'UPDATED_AT' | 'REMARK'>[];

const remarks = ['요청 내용 검토 중', '관련 부서 협의 필요', '처리 결과 확인 예정', '표준 절차에 따라 진행'];

export const searchSampleType2Rows: SearchSampleType2Row[] = Array.from({ length: 40 }, (_, index) => {
  const source = baseRows[index % baseRows.length];
  const sequence = String(index + 1).padStart(3, '0');
  const day = String((index % 27) + 1).padStart(2, '0');
  return {
    ...source,
    REQUEST_NO: `REQ-2026-${sequence}`,
    REQUESTED_AT: `2026-07-${day}`,
    EXPECTED_AT: `2026-08-${day}`,
    UPDATED_BY: index % 2 === 0 ? '관리자' : '업무담당자',
    UPDATED_AT: `2026-08-${day} ${String(9 + (index % 9)).padStart(2, '0')}:30`,
    REMARK: remarks[index % remarks.length],
  };
});
