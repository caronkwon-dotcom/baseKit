# SD 그룹 보완 Analysis V0 (2026-10-13)

## 원인과 책임 분리
기존 그룹 개요는 입력 그룹 구성원을 설계 근거로 인용했다. 그룹 밖 후보를 입력하지 않아 추가할 요구사항을 만들 수 없었다.
BSDRGANL 실행 인프라에 GROUP_RECOMMENDATION/GROUP_DESIGN을 명시한다. 기존 행과 유형 미지정 API는 GROUP_DESIGN이며 기존 설계 파싱·Snapshot·이력은 유지한다. 독립 BSDRANLS/BSDRARIT 추천 모델은 통합하지 않는다.

## 입력/출력 계약
POST /api/standard-design/requirement-groups/{id}/analyses
요청: VERSION, REQUEST_ID, PROJECT_NAME(선택), ANALYSIS_TYPE(GROUP_RECOMMENDATION 또는 GROUP_DESIGN).
동일 REQUEST_ID의 버전/유형 변경은 409. 실행은 기존 비동기 202, timeout과 RAW 보존 정책을 사용한다.
입력 JSON: project, group(groupId/groupName/groupDescription), requirements(현재 저장 그룹 상세 Snapshot), candidateRequirements.
후보는 동일 프로젝트이며 현재 그룹에 없고 DISCARDED_YN=N인 실제 요구사항 전체. requirementId/name/type/description/processDescription을 포함한다. 각 실행 REQUEST_JSON으로 후보까지 불변 보존한다.
출력: {"recommendedRequirements":[{"requirementId":"정확한 후보 ID","reason":"추천 사유"}]}.
최대 5건, 사유 1~2문장/200 Unicode 문자, 줄바꿈 금지. 잘못된 구조·건수·길이는 FAILED_INVALID_JSON. 후보 밖/기존 구성원/중복 ID는 제거하며 원문을 수정하지 않는다. 모두 제거되면 빈 추천으로 성공한다. 정규화된 사유는 원문 그대로 저장한다.

## DB/API
V17: BSDRGANL.ANALYSIS_TYPE(기존 GROUP_DESIGN), RESPONSE_VALIDATED_JSON 추가. RESPONSE_RAW_JSON은 HTTP 수신 원문 그대로 보존. 기존 REQUEST_JSON 보존 유지.
실행 목록에 ANALYSIS_TYPE 표시. 보완 상세 RESPONSE는 검증 완료 결과에서 조회한다.
GET /requirement-analysis-sources?PROJECT_ID=...&ANALYSIS_TYPE=GROUP_RECOMMENDATION은 보완 실행만 조회한다. 유형 미지정 및 /{id} 상세는 기존 독립 추천/설계 근거와 호환된다.
그룹 저장 시 BSDRGREV에 GA 실행 근거 연결. 기존 서버 프로젝트/근거/버전 검증과 중복 구성 거부를 유지한다.

## 화면
분석 탭 기본 유형은 그룹 보완, 그룹 설계 선택 가능. 요청 재확인 시 유형도 sessionStorage에서 복구한다. 실행 콤보에 유형을 표시하며 보완 결과는 추천 ID/원문 사유를 표시한다.
Analysis에서 추가 모달은 보완 실행 이력만 조회한다. 선택/요구사항/원문 추천 사유, 여러 실행 누적 선택과 최종 선택 검토를 유지한다. 이미 포함/폐기 항목 선택을 차단한다. 사용자가 초안에 추가 후 저장한다. 자동 추가/확정/설계 병합/Program 생성은 하지 않는다.

## 검증
- frontend build/lint, frontend 테스트 56건 통과.
- backend 전체 64건: 실패 0, 외부 PostgreSQL 조건 5 skip.
- 신규 통합 테스트: 그룹 3건/그룹 밖 후보 4건 입력, 폐기 후보 제외, hallucination/기존 그룹/중복/폐기 ID 제거, 원문 보존, 실행 이력/원문 사유 조회, 실제 그룹 추가(3→4), BSDRGREV 연결, DRAFT 유지, 중복 추가 400, 5건/200자/문장/JSON 제한.
- 기존 GROUP_DESIGN 회귀와 원문·timeout 테스트 유지 통과.
- 격리 H2 memory DB(8103), frontend 5196, 로컬 모의 LLM(18094) 브라우저 검수: 저장 그룹 3건 + 미포함 3건으로 보완 2회 SUCCESS, 각 2건 추천. 여러 실행에서 각 1건 선택 → 누적 2건 → 저장 그룹 5건. 원본 근거 재조회, 기존 항목 체크박스 disabled, console error 0 확인. 그룹 5건 저장 후 브라우저 보완 재실행은 남은 미포함 1건만 추천했고 GROUP_DESIGN 선택 실행도 SUCCESS로 개요 표시 확인. 최종 그룹 분석 통합 테스트 12건 통과.
- 샘플 추천: REQ-2C7400CF-9B5(입고 확인), REQ-56B084D0-AF5(발주 알림). 사유: 승인 이후 후속 처리와 연결되므로 함께 검토가 필요합니다. 검수 데이터는 모의 응답이며 실제 회사 모델 결과가 아니다.

## 한계
실제 회사 LLM와 운영 PostgreSQL V17 적용은 미검증. 프로젝트 전체 미포함 후보를 전달하므로 요구사항 대량/긴 설명 시 모델 context와 token 한도에 걸릴 수 있다. 후보 임의 절단·검색·벡터화는 도입하지 않았다. 문장 수는 종결 문장부호 기준이며 언어학적 판별은 하지 않는다. 삭제/폐기된 후보는 이력 원문으로 남고 UI/그룹 저장 정책으로 신규 추가를 차단한다.
