# SD 그룹 분석 표시 Adapter 계약

2026-10-17. COMMON-002 Props 확정 전 SD 내부 매핑까지만 구현했다.

## 연결 지점

`requirementGroupApi.analysis(groupId, analysisId)` 상세 결과를 `adaptGroupAnalysis(detail)`에 전달한다. 목록 API에는 원문/RESPONSE가 없으므로 상세를 먼저 조회한다. 현재 UI 연결은 후속 작업이며 기존 폴링·실행 이력·그룹 상태·추천 선택 API는 수정하지 않았다.

BSDRGANL의 REQUEST_JSON은 실행 입력 Snapshot, RESPONSE_RAW_JSON은 수신 HTTP 원문이다. GROUP_DESIGN 상세 RESPONSE는 원문 파싱 결과이며 최신 businessAreas/processCandidates/programCandidates와 기존 businessStructure/processes/screenCandidates를 지원한다. GROUP_RECOMMENDATION 상세 RESPONSE는 RESPONSE_VALIDATED_JSON에서 읽는 검증 결과다. `/requirement-analysis-sources`는 별도 읽기 전용 근거 projection이며 기존 추천 선택/근거 합산은 계속 이 API를 사용한다.

## SD 데이터 계약 v1

- SCHEMA_VERSION=1, ANALYSIS_ID, ANALYSIS_TYPE, STATUS, GROUP_VERSION: 실행 식별/상태. 상태를 성공으로 재해석하지 않는다.
- SUMMARY: 요약 문자열.
- SECTIONS[]: KEY(원래 섹션명), TITLE, ITEMS[]. 각 항목은 TITLE, DESCRIPTION, EVIDENCE_REQUIREMENT_IDS[]를 가진다. 최신/기존 섹션이 혼재해도 모두 보존한다.
- RECOMMENDATIONS[]: REQUIREMENT_ID, REASON. 검증된 상세 RESPONSE 또는 RESPONSE_VALIDATED_JSON만 사용한다. ID·사유·순서는 그대로 유지한다. RAW를 추천으로 복구하지 않는다. 이 배열은 표시용이며 선택/저장 DTO가 아니다.
- OBSERVATIONS[]: 문자열, 기존 객체 관찰은 JSON 문자열로 표시한다.
- WARNINGS[]: 서버 경고와 누락/잘못된 타입에 대한 Adapter 경고.
- SOURCE: REQUEST_JSON, RESPONSE_RAW_JSON, RESPONSE_VALIDATED_JSON 원문 문자열 또는 null. RESPONSE_JSON은 RESPONSE 전체를 직렬화한 값이며 원본 HTTP 문자열이 아니다. 미인식 필드도 여기에 보존한다.

성공(SUCCESS/SUCCEEDED)만 결과를 매핑한다. 실행 중/실패 상태는 원문만 보존하고 빈 표시 결과를 반환한다. 잘린 JSON, null, scalar, 잘못된 항목/근거 타입은 경고와 빈 값으로 방어한다. 입력 객체/배열을 수정하지 않는다. 텍스트는 HTML로 해석하지 않아야 한다.

## COMMON 연결 시 남은 일

COMMON-002가 Props를 확정하면 이 SD 모델을 공통 섹션/행/경고/원문 Props로 변환하는 얇은 연결을 추가한다. 실행 메타데이터, 원문 표시·복사 범위, 빈 상태/실패 상태 표현을 합의해야 한다. 공통 뷰어 Props로 본 계약을 확정한 것은 아니다. SD UI 최종 통합, DB 변경, 후보 확정/설계 DB 반영은 이번 범위 밖이다.

## 검증

Adapter 단위 테스트 6건과 기존 프론트 테스트를 포함한 총 67건 통과. build 통과(기존 대형 chunk 경고), lint 통과. Backend 회귀 결과는 현재 상태 문서에 기록한다. UI 변경이 없어 브라우저 최종 통합 검수는 수행하지 않았다.
