# SD 요구사항 그룹 V1 — 조사 및 첫 구현 단위

2026-10-06. 작업 브랜치 `sd-work`, 기존 worktree `G:/CARON/basekit/sd`.

## 기준과 진행 상태

- 제품 기준: 최신 `origin/dev-pm` `d1124d11bb636f466abffa65c9f29cad00ecebe3`.
- 시작 당시 sd-work `7233375`는 clean이며 31개 commit 뒤였다. 최신 기준으로 fast-forward 완료. dev-pm worktree도 clean, local/origin이 동일하여 별도 수정 불필요.
- DESIGN 인계: `81bf8896cf8cb24c87116fdd03d8100bbff1e26a`의 `SD-implementation-handoff.md`, UX/state/open-decisions. Prototype `693eaf1084abd73ab2482da469145756e8daf897`은 UX 참고다. design-work merge/copy 없음.
- 사용자 최신 계약이 DESIGN 제안보다 우선한다. 복수 근거 허용, 폐기 항목은 일률 확정 차단하지 않는 방향, 업무 제약 최소화.
- **전체 요구사항 그룹 관리 기능은 미완료다.** 이번 구현 단위는 사용자가 선택한 독립 Requirement 추천 결과 저장·조회 foundation이다. 그룹 화면/CRUD/확정/REVIEW_REQUIRED 처리는 아직 구현하지 않았다.

## 실제 구현 조사

- Requirement: `BSDRREQ`, 대표 REQUIREMENT_ID, 수정 MOD_DT. RequirementService는 물리 삭제이며 폐기 필드와 Revision 이력이 없다. 상태는 DRAFT/IN_PROGRESS/REVIEW/APPROVED만 허용한다.
- 기존 Analysis: `BSDAANLS`/`BSDAAREQ`/`BSDARSLT`/`BSDACAND`, Program 후보 분석이다. reanalyze는 동일 ID의 입력 snapshot을 교체한다. 독립 Requirement 추천 결과로 재해석하지 않는다.
- 프로젝트 master는 frontend repository 기준이며 이 기능에 사용 가능한 backend 프로젝트 master FK는 없다. 추천 항목의 project 경계는 실제 Requirement와 복합 FK로 검증한다.
- 기존 UI: MasterDetailMultiGrid, BaseKitDataGrid, PageHeader, ProjectContextSelector, FormModal, MetadataForm/기존 form class 재사용 가능. 새 CSS/토큰/레이아웃 체계는 추가하지 않는다.
- Endpoint 권한은 기존 Host의 EndpointPermissionProvider 및 grant 정책을 따른다. 인증 Host가 켜진 환경에서 새 endpoint grant 연결은 후속 통합 검수 대상이다.

## 이번 DB / API / 변경 파일

Migration `V12__create_requirement_recommendation.sql`을 backend와 database/migration에 동일하게 유지한다. V1~V11 기존 내용 변경 없음.

- `BSDRANLS`: 완료된 독립 추천 실행. ANALYSIS_ID, PROJECT_ID, REQUEST_ID, ANALYSIS_BASIS, EXECUTED_AT, REG_DT.
- `BSDRARIT`: 실행별 추천 Requirement, ORIGINAL_REASON, REQUIREMENT_MOD_DT. PK=(ANALYSIS_ID, REQUIREMENT_ID).
- 실행 request는 프로젝트별 고유. 신규 request는 별도 불변 실행이다. 이전 실행을 대체하거나 수정하지 않는다.
- `(PROJECT_ID, ANALYSIS_ID)`와 `(PROJECT_ID, REQUIREMENT_ID)` 복합 FK로 누락 참조/프로젝트 혼합을 차단한다. 빈 추천 결과 저장은 허용한다.
- 기준시각은 producer가 실행에 사용한 과거 snapshot이다. 현재 Requirement가 변경되어도 원본 추천 사유/기준을 덮어쓰지 않는다.
- `POST /api/standard-design/requirement-recommendations`: 외부 producer의 완료 결과 저장, AI 실행 없음. 동일 PROJECT_ID+REQUEST_ID+내용 재시도는 기존 결과 반환. 같은 request의 다른 내용은 409.
- `GET /api/standard-design/requirement-recommendations?PROJECT_ID=...`: 실행별 목록 및 항목.
- `GET /api/standard-design/requirement-recommendations/{id}`: 불변 결과/원본 사유 조회.
- `PUT/PATCH/DELETE /{id}`: 405. 결과 수정/삭제는 제공하지 않는다.
- 병렬 동일 request 저장의 DB unique 충돌은 409. 기존 REQUEST_ID가 있는지 프로젝트 목록으로 확인 후 재시도한다. 분산 동시성/실제 PostgreSQL 검증은 미실행.
- RequirementService: 추천 참조 존재 시 첨부파일 삭제 전에 물리 삭제를 차단한다. Requirement row lock으로 producer 저장과 삭제를 직렬화한다. 이 보호는 FK 무결성을 위한 최소 조치이며 최종 폐기 정책을 확정한 것이 아니다.
- Frontend: `requirementgroup/requirementRecommendationApi.ts`에 DTO/조회·저장 client만 추가. 화면/라우트/메뉴/CSS 변경 없음.
- Backend: `requirementgroup/RequirementRecommendationService`, Controller, ExceptionHandler 및 IntegrationTest 추가.

## 다음 그룹 구현 제안 (아직 구현/정책 확정 아님)

1. 그룹 master + 그룹/대표 Requirement N:M 구성 + 구성별 복수 Analysis 근거 분리. 그룹명 중복/구성 한도는 제한하지 않는다.
2. 기본정보+구성 원자 저장, 낙관적 version 검증. 확정 상태는 직접 저장 불가, 명시적 편집 전환. 확정 API 별도.
3. 저장된 검토 기준과 현재 Requirement를 서버에서 비교하고, Requirement 수정/폐기에 포함 그룹 전체 REVIEW_REQUIRED. 구성 자동 삭제/롤백 금지.
4. 구성별 사용자 포함 사유와 Analysis ORIGINAL_REASON 분리. 동일 Requirement에 여러 실행 근거 연결 가능.
5. 프로젝트별 좌 목록/우 기본정보/포함 Grid 및 직접 추가/독립 추천 실행 선택 모달. 검색 밖 선택/여러 실행 basket 보존, 수동 최종 추가.
6. Requirement relatedTab의 기존 업무관계/Traceability 유지, 포함 그룹 조회/그룹 선택 이동만 추가.
7. 저장/확정 경쟁, 미저장 이탈/409/늦은 응답, 빈/오류 상태, 주요 해상도 및 키보드 브라우저 검수.

## 미결정 사항 / 다음 입력

사용자에게 Requirement 삭제 정책 선택을 요청했으며 답변은 아직 없다.

- 선택 A: 그룹 포함 Requirement의 삭제를 폐기로 전환하여 대표 ID/구성 유지.
- 선택 B: 그룹 포함 Requirement 물리 삭제를 차단하고 폐기 기능 보류.

추천 결과 역시 대표 ID FK를 보유하므로, 최종 정책은 추천 근거에만 사용된 Requirement도 함께 고려해야 한다. 삭제를 조용히 폐기로 바꾸거나 새 폐기 상태를 임의로 확정하지 않는다. 사용자 지시의 불확실한 정책 최소 구현/보고 후 보류 원칙에 따라 최종 폐기/삭제 및 그룹 상태 연결은 보류한다.

## 검증

- 시작 기준 frontend build/lint 통과.
- 시작 기준 backend H2 test: 46건, 실패 0, 오류 0, skip 5.
- 신규 API 핵심 통합 테스트 3건 통과: 독립 실행·원본 보존·동일 request 멱등·다른 내용 409·수정 405·삭제 전 참조 보호·누락/타 프로젝트/중복 참조 원자 차단·빈 추천 결과·404/400.
- 변경 후 backend 전체 H2 test: 49건, 실패 0, 오류 0, skip 5 (44건 실행 통과).
- git diff --check 통과.
- 실제 PostgreSQL 적용, 회사 LLM, 인증 Host grant, frontend 실제 화면/브라우저 검수는 미실행. 이번 단위에는 화면이 없다.
- 최종 frontend build/lint 통과. 기존 bundle 크기 경고는 유지된다.
- frontend 회귀 테스트 53건 모두 통과.
- 최종 JDBC 시각 타입/마이크로초 정규화 보완 후 신규 통합 테스트 3건 재실행 통과.
- 제품 코드 commit: `d9430c548898bafbce8d85457af0e015c3ca5f1f`.

## 운영

작업 단위 제품/문서 commit 분리, sd-work push만 수행. commit/push 전 origin/dev-pm 재확인. 신규 branch/worktree 생성과 dev-pm 직접 개발/merge는 수행하지 않는다.
