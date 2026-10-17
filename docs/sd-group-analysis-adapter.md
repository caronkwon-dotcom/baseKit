# SD 그룹 분석 표시 Adapter 계약

2026-10-17. COMMON-002 LlmResultViewer와 SD 분석 탭 연결을 완료했다.

## 연결 지점

`requirementGroupApi.analysis(groupId, analysisId)` 상세 결과를 `adaptGroupAnalysis(detail)`에 전달한다. 목록 API에는 원문/RESPONSE가 없으므로 상세를 먼저 조회한다. RequirementGroupAnalysis에서 상세 결과를 Adapter에 전달하고 VIEWER_RESULT를 LlmResultViewer에 표시한다. 기존 폴링·실행 이력·그룹 상태·추천 선택 API는 수정하지 않았다.

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

## COMMON 화면 연결

VIEWER_RESULT는 저장용 스키마가 아닌 SD 내부 표시 projection이다. COMMON이 인식하는 summary, 한글 섹션별 카드, 목록과 evidence로 변환한다. 비검증 추천 RAW는 표시 추천으로 복구하지 않는다. 성공 텍스트/파싱 실패 원문은 텍스트와 Adapter 경고로 표시하며 빈 결과는 빈 객체, 실행 중은 loading으로 전달한다. 실패한 실행의 부분 결과는 표시하지 않는다.

공통 showRaw는 false로 두어 표시 projection을 원본 JSON으로 오인하지 않도록 한다. SD 화면의 분석 결과 JSON, 입력 Snapshot JSON, HTTP 수신 원문은 별도 상세로 유지한다. 미인식 필드는 RESPONSE_JSON에 보존한다. DB 변경 및 사람 확정 후 설계 DB 반영은 범위 밖이다.

## 검증

Frontend 85건(기존 Adapter 6 + 추가 COMMON 통합 3 포함), build/lint 통과. Backend 68건 중 63 통과/5 외부 조건 skip, 실패 0. 실제 localhost:5176/baseKit/#/standard-design/requirement-groups 에서 SDP-001 → 반품프로세스 → 분석의 추천/설계 저장 이력을 확인했다. 기존 번들/import 경고 유지. 새 LLM 실행과 업무 저장은 수행하지 않았다. 브라우저 스크린샷은 확인했으나 파일 저장은 도구 EPERM으로 미완료다.
