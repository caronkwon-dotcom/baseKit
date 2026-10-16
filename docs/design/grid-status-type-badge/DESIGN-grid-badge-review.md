# DESIGN 검토 결과 — Grid 상태/유형과 Endpoint Toolbar

2026-10-05 · 기준 dev-pm `a928069d23c11bdac52f5b6fbe1bf28048345eba`, 작업 시작 design-work `24bfdfaecdb8f8f5b608b86bce878955efb59dda`.

**이전 검수 판정:  UI 보정 일부 완료 / Endpoint Toolbar 통합과 좌우 시작선은 COMMON 확장 후 재검수 / 전체 디자인 완료 판정 보류 / 사용자 승인에 따라 dev-pm 통합.**

[DESIGN 역할](../DESIGN-role.md)을 적용한다. 과거 `40040d2` 기준 문서 검토는 당시 기록이며, Endpoint 미구현·코드 수정 금지·문서 인계만으로 종료한다는 판단은 현재 기준에 적용하지 않는다. 당시 원문은 Git 이력에 보존되어 있다.

## 확인한 문서와 코드

DESIGN-team-task, DESIGN-next-task, SD-UX-handoff, UX-review, COMMON-UX-requests, SD-V1-UX-review-ec70dc7, sd-v1-browser-results.json, SD-UX-wireframes.html과 Badge 작업지시/검토를 확인했다. README, 현재 상태, Architecture, ADR 025/026/027/030/033과 실제 ProgramManagePage/ProgramDataGrid/Grid adapter/CSS를 대조했다.

현재 Endpoint는 ProgramManagePage에 구현되어 있다. 옵션은 두 native select이며 ‘선택 Program 연결’은 표시 범위 select의 MAPPED option이다. 별도 세 번째 control이 아니다. 총건수는 visibleEndpoints, UNMAPPED metric은 전체 endpoints 집계다. 이 의미와 handler, API, DB, 권한 및 Action Code는 변경하지 않았다.

## DESIGN 직접 반영

| 항목 | 수정 전 | 직접 적용 |
|---|---|---|
| Source 상태 | 공통 BADGE 분기, 10px radius·2px 세로 padding·800 weight | 기존 column.render 안에서 AVAILABLE/NEW는 info, MISSING_SOURCE는 warn. 원 코드를 유지하는 compact semantic badge |
| Grid Badge | 행 줄높이에 의존하는 높이 | Grid 범위에 한정해 20px 높이·20px line-height·0 5px padding·4px radius·600 weight·한 줄 말줄임. 비 Grid metadata-badge는 유지 |
| 유형 | 정상 metadata는 SELECT+BADGE | 화면 field의 DISPLAY_TYPE만 TEXT로 변경. value/options/Select editor/validation 유지 |
| 분류 | SELECT+TEXT는 기본 텍스트 | 기존 renderer 분기 안에서 neutral label로 표시. 프로그램 유형과 COMMON/CUSTOM 포함, 신규 DisplayType/API 없음 |
| Title/Action | 1280에서 긴 Title/버튼 줄바꿈 | 공통 Title 한 줄 말줄임과 전체 title, 총건수·Action 수축 방지·버튼 한 줄 표현. 기본 Toolbar padding/gap/높이 유지 |
| Endpoint select | 화면 전용 기본 border/style | 공통 metadata-toolbar select의 28px/5px/0 7px/border-strong 패턴을 basekit-toolbar-control class로 재사용하고 focus-visible 적용 |

공통 CSS/renderer의 표현 변경도 DESIGN이 직접 수행했다. 공통 코드라는 이유로 모두 COMMON에 넘기지 않았다. 표현 변경 대상 외 업무 기능과 데이터 매핑은 변경하지 않았다.

## 남은 COMMON 요청

[COMMON-Endpoint-toolbar-request.md](COMMON-Endpoint-toolbar-request.md): ProgramDataGrid에는 옵션 삽입 slot이 없다. 기존 구조 밖의 옵션을 Toolbar 안으로 옮기려면 공통 확장이 필요하므로 사용자 지시에 따라 별도 요청으로 분리했다. 새 props/공통 구조를 DESIGN이 임의 추가하거나 화면 전용 absolute/음수 margin/빈 여백으로 맞추지 않았다.

옵션은 현재 공통 스타일을 적용했지만 **Toolbar 밖에 그대로 있다**. 모든 검수 조합에서 Endpoint header가 좌측보다 36px 아래에 있으므로 Toolbar 통합·좌우 시작선 항목은 FAIL이다. slot 제공 후 DESIGN이 기존 handlers/Actions를 재사용해 배치하고 동일 사례를 재검수한다. SD 추가 기능 개발 요청은 이번 변경에 없다. 과거 SD 검토의 기능 결함과 실제 LLM/DB 미검증은 이번 프로그램관리 보정으로 해소되지 않는다.

## 실제 브라우저 검수

설치된 Chrome headless에서 실제 React/CSS를 실행했다. 모든 /api 요청은 fixture로 대체하고 쓰기 요청은 차단했다. 실제 Backend/DB 연동 검수가 아니다. 1920×1080, 1440×900, 1280×800 각각 ICON_TEXT/ICON_ONLY를 검수했다. 상세 측정은 design-browser-results.json, 재현 코드는 scripts/design-program-ui-review.cjs에 기록한다. Playwright 모듈은 BASEKIT_PLAYWRIGHT_MODULE(또는 설치된 playwright), 브라우저는 BASEKIT_REVIEW_BROWSER(기본 chrome), 실행 URL은 BASEKIT_REVIEW_URL로 지정한다. BASEKIT_DESIGN_REVIEW_OUTPUT으로 캡처/측정 출력 폴더를 지정할 수 있다. 프로덕션 의존성은 추가하지 않았다.

| 항목 | 결과 |
|---|---|
| row/header | row 실측 32px, header theme 34px 유지(ag-header border-box 실측 35px) |
| Badge | 높이 20px, 측정된 Badge가 cell 내부에 포함. AVAILABLE/NEW/info, MISSING_SOURCE/warn 확인 |
| neutral label | 유형의 options label과 COMMON/CUSTOM 표현 확인 |
| Select | 두 control 28px, 5px radius, focus-visible 확인. 표시 범위 ALL→UNMAPPED 전환 후 총 15건 |
| Title/총건수/Action | 1280의 버튼 줄바꿈 제거. 긴 Title 말줄임 및 전체 title 유지. 두 버튼 모드 모두 확인 |
| hover/current/focus | 기존 row/cell class와 공통 선택·focus 스타일 유지. 상태 cell 클릭/hover 확인 |
| scroll/overflow | 각 지원 폭에서 document width=viewport. 30 Endpoint·22 Program fixture에서 내부 scroll 및 긴 값 확인 |
| 오류/쓰기 | 페이지 JavaScript 오류 0, 외부 DB 쓰기 0 |
| Endpoint 정렬 | 좌우 header 차이 36px: 미통과. 0건 상세에서도 높이 예약 확인, 구조 통합은 COMMON 대기 |

실측 좌우 header Y: 1920은 720.797/756.797, 1440은 612.797/648.797, 1280은 555.188/591.188 (두 모드 동일). 전체 화면 승인으로 기록하지 않는다. 지원 해상도는 ADR-009를 유지하며 1280 미만 모바일 정책은 바꾸지 않았다.

## 검증 및 merge 판정

Frontend build/lint, Backend test(42건, 실패/오류 0, PostgreSQL 조건 5건 skip), git diff --check 통과. Backend 실행의 초기 sandbox 경로/연결 제약은 작업 폴더 Maven cache와 허용된 다운로드로 해결했다.

문서와 직접 보정 코드를 design-work에 함께 commit/push한다. Endpoint Toolbar/좌우 시작선은 미완료지만, 사용자가 design-work push 및 dev-pm merge를 명시적으로 승인했다. 이번 보정 코드를 dev-pm에 통합하고 COMMON 확장 후 DESIGN 최종 보정·브라우저 재검수를 후속 과제로 유지한다. 통합 승인은 미통과 시각 항목의 완료 판정을 뜻하지 않는다.

## 이번 작업 최종 검수 (2026-10-05)

기준 최신 dev-pm: b28dc96bb22e87040a70c7af686e17c44c3741e5. design-work를 fast-forward 현행화했다. 이전 Badge·neutral Label 수정은 이미 dev-pm에 포함되어 재작성하지 않았다. 과거 문서 전체 merge 이력은 유지하고, 이번부터 제품 UI와 내부 산출물을 별도 commit으로 분리한다.

사용자 승인에 따라 최소 공통 Toolbar 옵션 슬롯과 선택형 좌우 Detail 정렬 계약을 구현했다. Endpoint Select 둘을 공통 Toolbar 둘째 행으로 옮기고 기존 handlers/disabled/권한 필터/metrics를 유지했다. 직계 Detail Grid들은 공유 subgrid track으로 같은 높이를 사용하며 옵션 줄바꿈에도 시작선을 유지한다.

Chrome 실제 React/CSS + API fixture: 1920/1440/1280 × ICON_TEXT/ICON_ONLY 6조합 통과. 좌우 Toolbar 상단/높이 및 Grid header 차이 0px, 0건 상세와 divider 너비 조절 후에도 header 일치. Row 32px, Header theme 34px(border-box 실측 35px), Badge 20px 셀 내부, Select 28px, neutral Label·표시 필터(UNMAPPED 15건)·내부 scroll 확인. 페이지 오류/쓰기 요청 0. 1280 ICON_TEXT 화면 캡처를 직접 확인했다. 실제 Backend/DB 연동 브라우저 검수는 아니다.

내부 문서 4개와 검수 스크립트 및 측정 JSON은 design-work 전용이다. dev-pm에는 frontend UI 파일 4개만 cherry-pick한다. 과거 본문의 미통과·전체 merge 지시는 과거 기록이며 이번 운영 기준에는 적용하지 않는다. COMMON 추가 구현 요청과 SD 기능 개발 요청은 없다.

이번 실행: frontend build/lint 및 git diff --check 통과. Backend 전체 42건, 실패/오류 0, 외부 PostgreSQL 조건 5건 skip. Vite 대형 chunk 경고는 기존 항목으로 남는다.
