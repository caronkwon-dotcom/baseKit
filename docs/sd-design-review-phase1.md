# BASEKIT SD — 설계 초안 검토 1차 구현·검증

2026-10-27. 기존 `G:\CARON\basekit\sd`, `sd-work`에서 구현했다. 기존 그룹 분석을 유지하면서 특정 GROUP_DESIGN 실행 결과를 별도 컴포넌트에서 읽기 전용으로 조회한다. 설계 저장·편집·채택·제외·확정·DB 모델 및 메뉴/화면 설계 반영은 구현하지 않았다.

## 사용법과 실제 URL

요구사항 그룹관리 → 그룹 선택 → 분석 → 성공한 ‘그룹 설계’ 실행 이력 선택 → 본문의 ‘설계 초안 검토 열기 · 읽기 전용’ 링크. 새 탭에서 기존 SD Shell을 유지한다.

[실제 반품프로세스 분석 열기](http://localhost:5176/baseKit/#/standard-design/design-review?project=SDP-001&group=RG-8407ff295d3f49b995ddad85ff9cd9fe&analysis=GA-cdd0ab6b40e849d99326bdbdfb1e5f7d)

- 기본 URL: `/baseKit/#/standard-design/design-review?project={PROJECT_ID}&group={REQUIREMENT_GROUP_ID}&analysis={ANALYSIS_ID}`
- WINDOW Shell에서는 `/baseKit/#/window/STANDARD_DESIGN/SD_REQUIREMENT_GROUP?workspace=design-review&project=…&group=…&analysis=…`를 사용한다.
- 분석 버전 선택은 URL의 analysis를 바꾼다. 새로고침·직접 진입에서도 해당 ID를 조회하며 최신 분석으로 대체하지 않는다.
- 근거 요구사항을 펼치면 해당 분석 입력의 명칭·Rev·본문·프로세스 설명을 조회한다. 현재 Rev는 비교용이며 원본을 대체하지 않는다.
- 복귀 링크는 프로젝트·그룹·분석 ID와 분석 탭을 유지한다. 그룹 소속을 GET으로 검증한 뒤 브라우저의 프로젝트 선택만 복원한다. 기존 분석/그룹 DB는 갱신하지 않는다.

## 실제 필드 계약

| 표시 내용 | 원본 |
|---|---|
| 요약 | 상세 `RESPONSE.summary.text` (기존 문자열 summary도 adapter 지원) |
| 업무 영역 | `RESPONSE.businessAreas[].name`, `description` |
| 프로세스 후보 | `RESPONSE.processCandidates[].name`, `description` |
| 프로그램 후보 | `RESPONSE.programCandidates[].name`, **`purpose`** |
| 후보 근거 ID | 각 후보의 `evidenceRequirementIds[]` |
| 근거 명칭·Rev·내용 | 해당 실행의 `REQUEST_JSON.requirements[].requirementId/name/revision/description/processDescription` |
| 현재 Rev·폐기 비교 | 요구사항 목록 GET의 `REQUIREMENT_REVISION`, `DISCARDED_YN` |
| 현재 그룹 | 그룹 GET의 `PROJECT_ID`, `REQUIREMENT_GROUP_ID`, `REQUIREMENT_GROUP_NAME`, `VERSION`, `GROUP_STATUS` |
| 분석 버전·상태·시간 | 상세의 `GROUP_VERSION`, `STATUS`, `CREATED_AT`, `COMPLETED_AT`, `ANALYSIS_ID` |
| 이전 결과 계약 | `businessStructure`, `processes`, `screenCandidates`가 실제 제공된 경우 별도 기존 섹션으로 표시 |

기존 DTO와 `adaptGroupAnalysis`를 재사용한다. 누락 명칭은 새 화면에서 ‘이름 미제공’, 빈 요약·목록·설명은 ‘등록된 내용 없음’, 누락 근거는 미제공으로 표시한다. 임의 후보나 근거를 생성하지 않는다. 분석 원본 JSON과 REQUEST_JSON은 펼쳐서 확인할 수 있다.

`REQUEST_JSON.project.projectId`, `group.groupId`가 제공된 경우 URL과 검증한다. 스냅샷 누락·파싱 실패·Rev 미제공은 경고하며 현재 명칭/내용으로 복구하지 않는다. 현재 그룹 버전 또는 요구사항 Rev 변경·폐기·삭제는 낡은 분석 경고로 표시한다.

## GET 부작용 검토

기존 `/analyses` GET은 `RequirementGroupAnalysisService.list()` → `expireRunning()`에서 만료 실행 상태를 UPDATE한다. 기존 API와 분석 탭 동작은 유지했다. 새 워크스페이스는 이미 존재하는 `/analyses/menu-draft` GET(`listForMenuDraft`, readOnly transaction)을 사용한다. 이름에 menu-draft가 들어 있지만 조회된 분석을 메뉴로 변환하거나 저장하지 않는다.

새 화면의 요청은 그룹 GET, 읽기 전용 이력 GET, 지정 분석 상세 GET, 프로젝트 요구사항 목록 GET이다. 상세 GET은 선택 분석의 원문을 파싱해 응답에 표시 계약을 추가할 뿐 DB를 변경하지 않는다. API/권한/기록 조회 오류를 숨기거나 샘플로 바꾸지 않는다.

## 검증

- 전체 프런트 테스트 **133/133 통과**. 신규 7개: 선택 ID 고정, GET 경로·메서드, 프로젝트/그룹/분석 ID 불일치, API 401/403/404/500, 스냅샷 보존·누락·파싱 오류·낡은 Rev, 빈 필드·purpose 매핑·실패 부분 결과 차단, 기본/WINDOW/복귀 URL.
- `npm run build`, `npm run lint`, `git diff --check` 통과. 기존 xlsx 정적/동적 import 및 번들 크기 경고 유지.
- `npm run backend:test`: **90건 중 78 통과, 외부조건 12 skip, 실패 0**. 격리 H2 테스트이며 개발 PostgreSQL 쓰기 테스트는 수행하지 않았다. 백엔드 소스·DDL·API 동작 변경 없음.
- 실제 Edge localhost:5176에서 본문 링크의 새 탭 진입, 독립 URL, 이전 분석 선택, 새로고침, 동일 그룹/분석으로 복귀, 기존 분석 탭·실행/이력/새로고침/원본 표시 유지 확인. 신규 분석 실행·저장·재확정은 하지 않았다.
- 실제 `GA-cdd0ab6b40e849d99326bdbdfb1e5f7d`, `GA-5f25ad76e45b4557ab10a1ea45178778`에서 서로 다른 저장 요약·후보 확인. 현재 그룹 v15/분석 v13, `REQ-0391B232-20E` 입력 Rev1/현재 Rev3 경고와 분석 당시 본문 펼침 확인.
- 실제 실패 기록 `GA-45c8b7e1939d44e49d44f107363e5ae6`의 FAILED_TIMEOUT·오류 원문 표시, 존재하지 않는 그룹의 오류, 실제 다른 프로젝트 ID와의 불일치 차단, 기본 Shell과 WINDOW Shell을 확인했다.
- 실제 RUNNING 기록은 0건이라 실행 중 상태와 API 권한 실패/빈 필드는 자동 테스트로 검증했다. 개발 데이터에 실패/빈 기록을 만들지 않았다. 실제 인증 주체별 권한 검증은 기존 로그인/권한 집행 미완성 범위와 동일하다.

개발 PostgreSQL은 `PGOPTIONS=-c default_transaction_read_only=on` 세션으로 SELECT만 수행했다. 브라우저 검증 전후 모두 그룹 **19**, 분석 **41**, 요구사항 **163**, RUNNING **0**. 전체 그룹 행 MD5 **61c07e33c145ee289b4edb3c849c30c9**, 전체 분석 행 MD5 **8865a8fc306d3a53ca76757c97372eb5**가 일치했다. 기존 서버를 재시작하지 않았다.

## 변경 파일

제품 코드 9개:

- `frontend/src/modules/standard-design/ui/pages/DesignReviewPage.tsx` — 신규 독립 검토 컴포넌트.
- `frontend/src/modules/standard-design/requirementgroup/designReview.ts` — GET 로더, URL, 입력 스냅샷·Rev 비교.
- `frontend/src/modules/standard-design/requirementgroup/requirementGroupApi.ts` — 기존 읽기 전용 목록 GET wrapper 추가.
- `frontend/src/modules/standard-design/requirementgroup/groupAnalysisAdapter.ts` — 신규 화면의 누락 명칭 표기 옵션 추가. 기존 호출 기본값 보존.
- `frontend/src/modules/standard-design/ui/components/RequirementGroupAnalysis.tsx` — 성공 GROUP_DESIGN의 본문 링크·복귀 분석 ID 초기화.
- `frontend/src/modules/standard-design/ui/pages/RequirementGroupPage.tsx` — 별도 컴포넌트 분기·검증된 복귀 컨텍스트 복원.
- `frontend/src/layouts/AppLayout.tsx` — 기존 그룹 프로그램으로 독립 경로 연결. 해당 SD 경로의 명시 프로젝트 컨텍스트 지원.
- `frontend/src/layouts/standalone/StandaloneShell.tsx` — SD 그룹 프로그램의 명시 프로젝트 컨텍스트 지원.
- `frontend/tests/design-review.test.mjs` — 신규 회귀 테스트.

문서 2개: `docs/sd-design-review-phase1.md`, `docs/basekit-current-status.md`. 공통 TITLE/Breadcrumb/메뉴·탭·툴바·버튼 컴포넌트 정의·공통 CSS는 변경하지 않았다. 기존 메뉴 설계·화면 설계 메뉴/코드 유지.

## Git 경계

시작/최종 확인 기준 `HEAD = origin/sd-work = origin/dev-pm = d10c9e2259af30fe5c8c4ba0a188312d332d0d3b`. fetch 성공. 구현 시작과 push 전 열린 PR 조회 결과 없음이며 sd-work를 head로 사용하는 다른 열린 PR도 없었다. 기존 미추적 `backend/data/` 보존·스테이징 제외. 새 branch/worktree, stash/reset, merge/rebase/cherry-pick, dev-pm 직접 수정 없음. 지정 sd-work에서 제품 코드와 검증 문서를 분리 커밋한다. PR은 dev-pm 대상 검토용이며 PM 병합하지 않는다.

제품 코드 커밋: `e56b941` (9개 파일). 문서 커밋은 별도로 분리한다.

## 다음 단계의 별도 Draft 계약 — 미확정·미구현

분석 원본과 별도 Draft 저장 계약을 확정해야 한다. 검토 항목은 `DESIGN_DRAFT_ID`, `PROJECT_ID`, `REQUIREMENT_GROUP_ID`, `SOURCE_ANALYSIS_ID`, `SOURCE_GROUP_VERSION`, 입력 스냅샷/근거 Rev, Draft `VERSION`, 후보별 안정 ID와 사람의 편집/채택/제외 상태, 저장·확정의 권한 및 동시성, 확정 산출물과 메뉴/화면 설계의 연결 방식이다. 후보의 배열 순서나 AI 이름을 영구 식별자로 사용하지 않는 정책도 다음 단계에서 결정한다. 이번 조회 계약을 Draft 저장 스키마나 확정 설계로 간주하지 않는다.
