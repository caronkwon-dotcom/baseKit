# Issue #38 AI 그룹핑 본문 구현

## 기준과 범위

2026-10-22, G:/CARON/basekit/sd, sd-work. 시작 시 HEAD/origin/sd-work/origin/dev-pm 모두 546ed6f55626800b7240f34dfd7c928701f5e122이며 열린 PR 없음. 이전 PR #37 작업 경계 차단은 해소되었다. 신규 branch/worktree, dev-pm 직접 변경/병합 없음. backend/data/는 기존 미추적 상태로 보존했다.

## 진입과 독립성

프로젝트 Context를 선택한 상태에서 다음 URL로 진입한다.

- 원본 AI 그룹핑-1: /baseKit/#/standard-design/requirement-groups?grouping=original
- 신규 AI 그룹핑: /baseKit/#/standard-design/requirement-groups?grouping=review
- 기존 그룹관리의 AI 그룹핑 버튼은 원본을 유지한다. 검증 전 기본 진입 교체 없음.
- 본문 안의 텍스트 링크로 두 버전을 이동한다. 미저장 변경 확인은 기존 leave 조건을 사용한다. 복귀 시 grouping 쿼리만 제거하고 나머지 쿼리를 유지한다.
- ProjectGroupingOriginalResults.tsx의 원본 renderGroup 본문은 기준 커밋 546ed6f에서 그대로 보존했다. 신규 ReviewResults는 이를 호출하지 않는다. 이력/비교/상태/기존 액션과 API 처리는 기존 ProjectGroupingWorkspace가 유지한다. 원본과 신규는 별도 마운트로 화면 상태를 공유하지 않는다. 동일한 서버 데이터를 조회하는 기존 계약은 유지한다.
- 공통 컴포넌트, TITLE, Breadcrumb, PageHeader, 상단 메뉴/탭/툴바, projectGrouping.css와 기타 공통 CSS는 변경하지 않았다. 새 CSS는 .pg-review 하위로만 제한했다. 공통 껍데기·ActionButton을 복제/재배치하지 않았다.

## 실제 필드 매핑

ProjectGroupingService.start는 RequirementService.list의 전체 RequirementData를 REQUEST_JSON에 저장한다. get은 이를 INPUT으로 반환한다. 프런트 GroupingInput 선언은 식별자/이름/revision만 선언하지만 실제 분석 스냅샷에는 아래 필드가 있다. API/DTO/DB 계약을 늘리지 않고 신규 본문 내부에서 기존 필드만 읽는다. 추가 조회·저장 호출 없음.

| 표시 | 실제 출처 |
|---|---|
| 그룹명 | DRAFT.GROUPS[].TITLE |
| 별도 그룹 설명 | 현행 필드 없음. 등록된 내용 없음 표시 |
| AI 그룹핑 사유 | 해당 GROUP_ID의 AI_DRAFT.GROUPS[].REASON, AI_DRAFT가 없는 이전 이력은 저장 DRAFT.GROUPS[].REASON |
| 요구사항 이름/revision | INPUT[].REQUIREMENT_NAME / REQUIREMENT_REVISION |
| 원문 내용 | INPUT[].DESCRIPTION |
| 업무 프로세스 | INPUT[].PROCESS_DESCRIPTION |
| 설계 의견 | INPUT[].DESIGN_OPINION |
| 개별 포함 사유 | DRAFT.GROUPS[].MEMBERS[].REASON |

누락/빈 필드는 등록된 내용 없음. 현재 요구사항으로 과거 분석 원문을 대체하지 않는다. 그룹 설명을 REASON과 중복 생성하지 않는다. 새 필드·새 승인/저장 기능·최종 구성함 없음. 여러 details 행을 동시에 펼칠 수 있으며 원문은 읽기 전용이다.

## 검증

- 프런트 122/122, build/lint/diff check 통과. 기존 xlsx 동적 import 및 큰 chunk 경고 유지.
- 백엔드 90건: 실패/오류 0, 통과 78, 외부조건 skip 12. 기존 그룹관리 확정/등록 관련 통합 테스트 포함. 실제 DB를 검수 목적으로 저장·확정하지 않았다.
- 추가 회귀: 원본/신규 DOM 구분, 공통 액션 비활성 조건 동일, 원문/프로세스/설계 의견/개별 사유/누락 필드 표시, 양쪽 이력 비교, 승인→선택→save(version 1)→register(version 2) 순서, AI 원본/입력 불변성.
- 실제 Edge5176 + 기존 localhost8081 백엔드: 최신 분석 대상22건/그룹6개/미분류0, 원본 이력 선택(등록된 그룹 잠금 유지), 양쪽 이력 비교, 신규 그룹 선택, 두 행 동시 펼침(open=2), 실제 원문·프로세스·사유와 빈 설계 의견 표시, 검토 승인 후 등록 대상 선택 및 등록 버튼 활성화 확인.
- 브라우저 비교 결과: 변경5/추가1/제외0. 원본/신규/펼침/비교 스크린샷 확보.
- 미저장 상태에서 버전 링크 이동 시 기존 confirm이 발생했다. 이후 브라우저 자동 제어가 응답하지 않았고 Computer Use도 현재 URL을 확인할 수 없다는 이유로 이번 턴 UI 제어를 중단했다. 확인창 해제/취소 후 복귀 및 좁은 화면 브라우저 검수는 미완료다. 실제 서버 저장·등록·최종 확정과 신규 AI 실행은 브라우저에서 수행하지 않았다. 저장/등록 흐름은 격리 API 테스트, 최종 확정은 기존 백엔드 통합 테스트 결과로 구분한다.

## 변경 파일

- frontend/src/modules/standard-design/ui/components/ProjectGroupingWorkspace.tsx: 기존 껍데기/핸들러 유지, 본문 슬롯과 버전 링크
- frontend/src/modules/standard-design/ui/components/ProjectGroupingOriginalResults.tsx: 기준 원본 그룹 본문 독립 보존
- frontend/src/modules/standard-design/ui/components/ProjectGroupingReview.tsx: 신규 30:70 본문과 원문 펼침
- frontend/src/modules/standard-design/ui/components/projectGroupingReview.css: 신규 본문 전용 토큰 스타일
- frontend/src/modules/standard-design/ui/pages/RequirementGroupPage.tsx: URL 버전 선택 및 기존 복귀 처리 연결
- frontend/tests/project-grouping-review.test.mjs: 원본/신규 회귀
- docs/sd-ai-grouping-content-review.md, docs/basekit-current-status.md: 구현 및 검증 상태

제품 커밋과 문서 커밋은 분리한다. PR은 dev-pm 대상으로 제출하되 잔여 브라우저 검수를 명시한 draft로 둔다. PM 승인 전 병합하지 않는다.

제품 반영 대상 SHA: 33d0dcdaf6e114452070742cf8588f8b4b1b9bd9
