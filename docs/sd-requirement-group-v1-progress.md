# SD 요구사항 그룹 관리 V1 구현 보고

2026-10-06 · 기존 `G:/CARON/basekit/sd` · `sd-work`

## 완료 범위와 운영 기준

요구사항 그룹 관리의 DB/Backend API/Frontend/상태 처리와 독립 Requirement 추천 결과 저장·조회를 구현했다. 사용자가 그룹 구성을 선택하고 확정하며 AI가 자동 추가/확정하지 않는다. 그룹 분석·설계, Program/프로세스/Layout 생성과 LLM 실행은 제외한다.

- 작업 시작 전 origin/dev-pm `d1124d11bb636f466abffa65c9f29cad00ecebe3` 기준으로 sd-work를 fast-forward했다. local dev-pm도 같은 commit이고 clean임을 확인했다.
- 신규 branch/worktree 생성, dev-pm 직접 개발/merge 없음. design-work 전체 merge/산출물 이관 없음.
- DESIGN 기준: `81bf8896cf8cb24c87116fdd03d8100bbff1e26a`의 `SD-implementation-handoff.md`와 UX/state/open-decisions. Prototype `693eaf1084abd73ab2482da469145756e8daf897`은 UX 참고다.
- 사용자 확정 계약이 DESIGN의 미결정 제안보다 우선한다. 여러 Analysis 근거와 직접 추가를 혼합하고, 폐기 Requirement도 검토 후 유지·재확정할 수 있다.
- 기존 MasterDetailMultiGrid/BaseKitDataGrid/PageHeader/FormField/ActionButton/FormModal/ProjectContextSelector와 제품 CSS를 재사용했다. 신규 CSS/디자인 토큰/레이아웃 체계 없음.

이 문서는 이전의 foundation-only/폐기 정책 답변 대기 보고를 대체한다.

## 확정 정책

Requirement DELETE는 물리 삭제가 아닌 폐기(`DISCARDED_YN=Y`)다. 대표 REQUIREMENT_ID와 첨부파일·메뉴 관계·추천 결과·그룹 구성·Analysis 근거를 보존한다. 이미 폐기된 Requirement를 다시 폐기해도 Revision이 증가하지 않는다.

내용/상태/메뉴 관계 저장 및 첨부 추가·제거 시 Requirement Revision을 증가시키고 포함 그룹 전체를 REVIEW_REQUIRED로 전환한다. 폐기 시도 동일하다. 그룹 구성이나 근거는 자동 제거/롤백하지 않는다. 사용자가 변경 영향과 이전 검토 snapshot을 비교하고, 구성을 조정하거나 현재 Revision의 검토 완료를 저장한 뒤 재확정한다.

확정 그룹은 명시적인 구성 수정으로 DRAFT에 전환해야 편집/삭제할 수 있다. 빈 DRAFT 저장은 허용하며, 확정에는 구성 1건 이상과 현재 Revision 검토가 필요하다. 그룹명 중복/여러 그룹 포함/구성 수는 제한하지 않는다. 동일 그룹의 같은 Requirement 중복, 잘못된 참조, 프로젝트 경계 위반은 차단한다.

## DB migration

기존 V1~V11을 변경하지 않았다. V12/V13은 backend와 database/migration에 동일 파일로 유지한다.

| Migration | 구조 |
|---|---|
| V12__create_requirement_recommendation.sql | BSDRANLS 독립 추천 실행, BSDRARIT 실행별 Requirement/원본 추천 사유/기준시각 |
| V13__create_requirement_groups.sql | BSDRREQ 폐기 플래그·Revision, BSDRRHIS Revision snapshot, BSDRGRP 그룹 master, BSDRGRQ N:M 구성·사용자 포함 사유·검토 기준, BSDRGEVD 구성별 복수 Analysis 근거 |

추천 실행은 immutable이며 이전 실행을 자동 대체하지 않는다. 기존 Program Analysis(`BSDAANLS` 등)의 실행/재분석 모델은 유지한다. 추천 producer의 저장 API만 제공하고 분석 실행은 추가하지 않았다.

구성 PK는 (그룹, Requirement), 근거 PK는 (그룹, Requirement, Analysis)다. 프로젝트 복합 FK와 추천 항목 FK로 실제 동일 프로젝트 참조를 강제한다. 프로젝트 master backend가 없으므로 프로젝트 자체 존재는 기존 Context 계약을 따르고, 연결된 Requirement/Analysis의 프로젝트 일치는 DB/서비스에서 검증한다. Revision baseline은 기존 데이터의 첫 변경 시 확보하며 이후 변경마다 snapshot을 기록한다.

## API

응답은 기존 ApiResponse의 DATA/MESSAGE 계약을 따른다.

| Method | 경로 | 기능 |
|---|---|---|
| POST | /api/standard-design/requirement-recommendations | 완료된 독립 추천 결과 저장, 분석 실행 없음 |
| GET | /api/standard-design/requirement-recommendations?PROJECT_ID=... | 실행 목록과 추천 항목 |
| GET | /api/standard-design/requirement-recommendations/{id} | 불변 원본 근거 조회 |
| GET | /api/standard-design/requirement-groups?PROJECT_ID=... | 프로젝트 그룹 목록 |
| GET | 위 경로 + REQUIREMENT_ID=... | 해당 Requirement의 포함 그룹 조회 |
| GET | /api/standard-design/requirement-groups/{id} | 구성/검토 snapshot/현재 Requirement/복수 근거 ID |
| POST | /api/standard-design/requirement-groups | 그룹 기본정보+구성+근거 원자 저장 |
| PUT | /api/standard-design/requirement-groups/{id} | VERSION 검사 후 원자 수정 |
| POST | /api/standard-design/requirement-groups/{id}/edit | 확정 그룹의 명시적 편집 전환 |
| POST | /api/standard-design/requirement-groups/{id}/confirm | 최신 검토 기준 확인 후 확정/재확정 |
| DELETE | /api/standard-design/requirement-groups/{id}?VERSION=... | 그룹만 삭제, 원본 Requirement/Analysis 보존 |
| DELETE | /api/standard-design/requirements/{id} | 기존 204 계약 유지, 실제 동작은 폐기 |

Group 저장 payload: PROJECT_ID, REQUIREMENT_GROUP_NAME, DESCRIPTION, VERSION, REQUEST_ID, MEMBERS. 구성은 REQUIREMENT_ID, HUMAN_YN, INCLUSION_REASON, REVIEWED_REVISION, SOURCE_ANALYSIS_IDS. GROUP_STATUS/검토 snapshot은 서버가 결정한다. 사용자 포함 사유와 Analysis 원본 사유는 별개다.

추천/그룹 신규 저장은 프로젝트별 REQUEST_ID로 같은 요청 재시도 시 기존 결과를 반환하고 다른 payload는 409다. 동시 신규 요청의 unique 경쟁은 409로 처리하므로 목록 조회 후 재시도한다. 그룹 수정/확정/편집/삭제는 VERSION으로 조용한 덮어쓰기를 차단한다. Requirement를 정렬된 순서로 lock한 뒤 그룹을 lock하며 Requirement 변경과 확정 경쟁을 직렬화한다. JDBC 컬럼명이 소문자인 DB에서도 응답 필드를 SCREAMING_SNAKE_CASE로 정규화한다.

## 화면

- 프로그램 `SD_REQUIREMENT_GROUP`, 메뉴 `STANDARD_DESIGN.REQUIREMENT_GROUP`, 경로 `/standard-design/requirement-groups`.
- 좌 그룹 목록/검색, 우 기본정보·상태·구성 Grid. 기존 프로젝트 Context와 Action 권한 계약 사용.
- 직접 추가/Analysis 선택은 기본 미선택이며 검색·여러 실행 변경에도 선택 basket을 유지한다. 최종 선택 확인 후 초안에만 반영한다. 저장/확정은 사용자 별도 동작이다.
- 같은 Requirement는 1건으로 병합하고 HUMAN 여부·사용자 사유·기존 근거를 유지하며 새 근거를 합친다.
- 폐기 표시, 이전 검토 snapshot/현재 내용 비교, 변경 검토 완료 및 재확정. 확정 상태는 읽기 전용이며 구성 수정으로 명시적 전환한다.
- 미저장 그룹/프로그램 이동은 계속 편집, 저장 후 이동, 버리고 이동을 제공한다. 프로젝트 Context 변경은 기존 Selector의 동기 계약에 맞춰 버림 확인을 제공한다. 저장/조회 실패와 409는 초안을 유지하고 최신 조회·비교로 복구한다.
- Requirement 상세의 기존 연관정보/Traceability를 유지하고 포함 그룹 조회·해당 그룹 MDI 이동만 추가한다. 그룹 편집은 그룹 관리에서 한다.

## 변경 파일

경로는 저장소 기준이다. 상세 diff는 제품 commit으로 확인한다.

- Backend Requirement: RequirementData.java, RequirementRow.java, RequirementJpaEntity.java, RequirementMapper.java, RequirementService.java 및 RequirementMapper.xml.
- Backend requirementgroup: RequirementRecommendationController/Service/ExceptionHandler, RequirementGroupController/Service.
- Migration: backend/src/main/resources/db/migration 및 database/migration의 V12/V13.
- Backend tests: RequirementRecommendationIntegrationTest, RequirementGroupIntegrationTest, RequirementIntegrationTest, ProjectMenuIntegrationTest.
- Frontend: layouts/AppLayout.tsx, modules/standard-design/module.tsx, requirement/requirementApi.ts, requirementgroup/requirementRecommendationApi.ts 및 requirementGroupApi.ts.
- 화면: RequirementGroupPage.tsx, IncludedRequirementGroups.tsx, RequirementIntakePage.tsx.
- Frontend test: tests/requirement-group.test.mjs.
- 문서: 이 보고, basekit-current-status.md, decisions/034-sd-requirement-group-v1.md.

## 검증 결과

- Backend 전체 H2 test: 51건 중 46건 실행 통과, 실패/오류 0, 기존 환경 의존 5건 skip.
- 그룹 통합 테스트는 DATABASE_TO_LOWER=TRUE 환경에서도 실행하여 실제 API 대문자 필드 계약을 검증했다.
- 핵심 통합 흐름: N:M/동명 그룹/2개 Analysis 근거, 신규 저장 재시도, 확정 직접 수정 차단, 폐기 후 두 그룹 REVIEW_REQUIRED·근거/구성 보존, 오래된 검토/그룹 VERSION 거절, 검토 저장 후 폐기 항목 유지 재확정, 반복 폐기 멱등, 누락/중복/타 프로젝트 원자 차단, Revision 이력. Requirement 회귀는 폐기 후 실제 첨부 bytes 조회도 검증한다.
- Frontend node tests 55건 모두 통과. 같은 Requirement 병합 시 사용자 사유/기존 검토 Revision/복수 근거 유지와 서버 관리 필드 미전송 검증 포함.
- Frontend build/lint 통과. 기존 큰 JS bundle 경고는 유지된다. CSS 산출 hash `index-vWKBQaAN.css` 유지.
- git diff --check 통과, V13 두 migration 파일 SHA256 동일.
- 격리된 H2 memory DB(8093) + SD frontend(5177)에서 실제 브라우저 검수: 직접 추가 기본 미선택, 검색 후 선택 보존, 두 Analysis 비교·혼합·중복 병합, 저장/확정, Requirement 연관 그룹 이동, 폐기 표시 및 REVIEW_REQUIRED, 검토 완료 저장·재확정, 복수 원본 사유, 미저장 이탈 취소/저장 후 이동, Modal Shift+Tab/Escape.
- 1440×900 화면 캡처 완료. 1024×768/375×667은 기존 제품 최소 폭 1280에 따른 가로 스크롤을 확인했다. 모바일 전용 재배치는 추가하지 않았다.

## 통합 단계의 확인 항목

실제 PostgreSQL 적용·다중 서버 동시성, 인증 Host의 신규 endpoint grant는 미검증이다. 기존 Flyway V1~V11 checksum은 건드리지 않았으며 승인 DB에서 V12/V13 적용은 별도 통합 단계에 수행한다. 추천 결과 producer/회사 LLM 실행과 과거 Program Analysis 변환은 이번 범위에 없다. 현재 추천 결과가 없다면 직접 추가를 사용하며 추천 목록은 빈 상태를 표시한다.

폐기된 Requirement의 기존 메뉴 관계도 보존하므로 관련 Project Menu 삭제는 기존 FK 검증에 따라 계속 제한된다. 복구/Revision 이력 조회 화면은 이번 범위에 추가하지 않았다.

브라우저 검수 URL은 `http://localhost:5177/baseKit/#/standard-design/requirement-groups`이며 전용 H2 memory DB를 사용한다. 운영 DB 데이터가 아니다. 서버 종료 시 fixture는 사라진다. 확인된 사용자 미저장 입력은 보존했다.

## Commit

- 독립 추천 결과 제품: `d9430c548898bafbce8d85457af0e015c3ca5f1f`.
- 최초 조사/중간 문서: `ae125b7d9cb4f99fa8a34869f949567eb8822992`.
- 그룹 관리/폐기·Revision/화면/회귀 테스트 제품: `4223a801e2875f720a49bc009086e743f5d1f950`.
- 최종 문서는 별도 commit. sd-work commit/push만 하며 dev-pm merge는 별도 통합 단계다.
## dev-pm 통합 후 화면 오류 점검 (2026-10-06)

- 그룹 조회 404 원인은 코드 누락이 아니라 2026-10-05부터 실행 중인 이전 dev-pm 백엔드 프로세스였다. dev-pm 제품 소스는 수정하지 않고 최신 compile 확인 후 해당 8080 서버만 같은 dev-pm profile로 재시작했다.
- 실제 PostgreSQL 17.11에서 Flyway 13개 migration 검증 통과, schema up to date. `/api/standard-design/requirement-groups?PROJECT_ID=SDP-001` 직접/5173 proxy 조회 200과 DATA=[] 확인. 브라우저의 정상 빈 목록 및 신규 그룹 활성 확인. 기존 데이터에 쓰기 테스트는 하지 않았다.
- ProgramDataGrid가 custom toolbar의 key를 actionCode만 사용하여 두 CREATE 버튼이 충돌했다. 권한 코드는 유지하고 actionCode+label로 화면 key를 구분했다. 제품 수정 commit a2c60889036a0275dfdef3a62b7a6df6393c1c64 (1줄).
- SD frontend build/lint 통과, 새 브라우저에서 콘솔 error 0 확인. 새 CSS/migration/backend API 수정 없음.
- local dev-pm은 e69533e로 V1 통합되어 있고 origin/dev-pm은 d1124d1이다. SD는 해당 local 통합 commit과 같은 기준에서 수정했다. 신규 branch/worktree 없음.
- 사용자 승인 후 수정 commit a2c6088만 로컬 dev-pm에 fast-forward 통합했다. 새 5173 검증 탭에서 정상 빈 목록과 콘솔 error 0 확인. dev-pm 소스 직접 개발/추가 commit 및 origin/dev-pm push는 하지 않았다.
