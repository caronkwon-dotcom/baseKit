# Project Management Reference UI 인계 및 검증

2026-09-19 / feature/project-management-reference-ui / 사용자 검수 대기

## Copilot 중단 지점

- Worktree: `caronkwon-dotcom-potential-invention`.
- HEAD: `bb356817c842c914e0a8d6755e3b1ecef1c0e0f3`. Feature 생성 이후 commit 없이 중단.
- Staged 0개, unstaged 4개: current-status, module README, scoped CSS, DesignLifecyclePage.
- Untracked: ADR 029와 ProjectListDetailWorkspace 컴포넌트. 임시 결과가 아닌 기능 초안이 남아 있어 이어받기 가능.
- 시작 전 원본 6개 파일과 binary diff를 별도 작업 공간 `artifacts/copilot-handoff-before`에 보존. reset/rebase/stash/다른 작업 덮어쓰기 없음.
- 중단 시각은 확정 불가. reflog상 16:02 feature 전환, 파일 수정시각상 약 16:06~16:12에 구현·문서 작성. 코드·문서 작성 후 commit 및 검증 결과 기록 전 상태로 판단.

## 요구사항별 인계 상태

아래의 중단 상태는 코드 검사 기준이며, 당시 실제 UI 검증 완료를 의미하지 않는다.

| 항목 | 중단 상태 | 인계 후 |
| --- | --- | --- |
| 상단 Action compact | 부분완료: 간격 축소, 설명 잔존 | 설명 제거, 우측 동일 Action 배치 검증 |
| Message UX | 부분완료: 조건부 배너, WARN/ERROR 동일 아이콘 | 오류 아이콘 분리, 빈 공간 없음, 저장/삭제/필수값/검색 없음 검증 |
| Grid 컬럼 폭 | 완료 초안 | ID 76px 및 고객명 최소 폭 조정, 30% 목록 가로 scroll 검증 |
| Resizable splitter/collapse | 부분완료: drag/접기 구현, 폭 계산·접근성 누락 | splitter 폭 반영, ResizeObserver, 이벤트 정리, 독립 접근성 버튼, keyboard 검증 |
| 검색조건/결과/선택 유지 | 완료 초안 | 검색→상세→접기→복원→목록 흐름과 복합 검색 검증 |
| Project ID compact | 완료 초안 | label/value 한 줄 및 신규 ID 미생성 검증 |
| Detail 신규 | 완료 초안 | 일반/확장 상세에서 신규, 저장 전 미반영, validation 검증 |
| Simple Copy | 부분완료: 기본 필드 초안 복사 | 복사 즉시 미저장 보호, 저장 직전 최신 ID 계산, 신규 저장/삭제 검증 |
| Deep Copy 원칙 문서화 | 완료 | 별도 미통합 공통 branch 존재와 검증·범위 설명 보완 |
| build/lint/회귀/UI 검증 기록 | 미착수 또는 증거 없음 | 아래 검증 수행 |

## Git 조사 및 통합 주의

- 로컬 `dev-pm`: `ee921926e436ceb1c2034e9613026378e053697e` (변경하지 않음).
- 원격 조회/fetch 시 `origin/dev-pm`: `0708b7203eb118cbf4285f5d5f5171f9de8ef55a`.
- 인계 branch보다 원격에 2 commits 추가: `c820cb6` 검색·상세 UX 및 `0708b72` 통합 commit. 이번 feature의 검색·목록 전환 코드와 중복되는 부분은 diff로 비교했다.
- 관련 worktree `expert-disco` (`7e27dac`), `ideal-journey` (`c820cb6`), `miniature-goggles` (`4e8cf29`)는 모두 clean. 공통 Layout branch는 아직 기준 dev-pm에 없음.
- 메인 worktree의 다른 작업 디렉터리들과 start-basekit.bat은 기존 untracked 상태 그대로 보존했다.
- 원격 open PR 조회 결과 0개. 원격 branch push 및 PR 생성은 수행하지 않는다.
- Feature가 origin/dev-pm을 upstream으로 추적하던 설정을 해제해 실수로 dev-pm을 push하지 않도록 한다.
- 최신 dev-pm을 feature에 merge/rebase하지 않았다. 향후 승인된 통합 시 동일 파일의 충돌을 검토해야 한다. 현재 feature 자체의 동작 검증이며 통합 결과 검증은 아니다.

## 검증 결과

- `npm run build`: 통과. 기존 대형 번들(500kB 초과) 경고 있음.
- `npm run lint`: 통과.
- `node --experimental-strip-types --test frontend/tests/project-reference.test.mjs`: 5 tests 통과. 필드 복사 제외/원본 보호, dirty 보호, 복합 검색, ID 충돌 방지, splitter 최소 폭 검증. Node 22.12+ 실행 기준.
- `npm run backend:test`: 21 tests, failures/errors/skipped 0, BUILD SUCCESS.
- `git diff --check`: 통과.
- 실제 브라우저: 별도 `127.0.0.1:5187` origin에서 검증. 기본 프로젝트 원본은 변경하지 않고 복사한 QA 프로젝트만 생성·삭제.
- 검색명/고객명/상태, 조회 없음 경고, 초기화, 프로젝트명 클릭, 드래그 30→41%, 접기 0→복원 41%, 목록 복귀 검색 유지, keyboard Home/ArrowRight 검증.
- Detail 신규 및 expanded 상태에서 신규, 복사 직후 ID 미생성/목록 건수 불변, 미저장 이탈 경고, 복사 후 저장 SDP-002 생성, QA 복사 삭제/성공 메시지, 필수값 오류 확인.
- 1280×800 / 1440×900 / 1920×1080에서 목록 grid scrollWidth=clientWidth 및 body 가로 overflow 없음 확인.
- 저장/삭제/조회 실패를 강제 주입한 테스트 및 MDI tab 종료 경고는 이번 검증 범위에 포함하지 않음. 기존 localStorage Prototype 동작이며 Backend CRUD로 전환하지 않음.

## 변경 범위

Project 전용 페이지 분기, module scoped CSS, module 내부 workspace/정책 함수, 회귀 테스트, 문서. 다른 Lifecycle view, Core 공통 컴포넌트, 권한 Framework, Backend/DB 변경 없음. Deep Copy는 원칙만 문서화.

## 사용자 승인 후 통합

사용자가 dev-pm 병합을 요청해 통합을 승인했다. 원격 origin/dev-pm의 0708b72를 feature에 먼저 결합했다. 프로젝트 페이지와 scoped CSS의 이전 UX 구현 충돌은 검증된 Phase 2 구현을 유지해 해결하고, 원격에서 추가한 현재 상태 문서는 보존했다. 위 Git 통합 대기 설명은 인계 당시의 이력이며 이번 승인으로 해제된다. 원래 작업 commit 5af197e는 이력에 보존한다.

## 후속 마무리 — Codex

2026-09-19 기준 `codex/project-reference-refine`에서 Project Management Reference UI의 후속 UX를 반영했다. Project Context 전역 표기를 제거하고 검색/목록 영역을 Working Set 왼쪽 pane으로 이동했으며, 상세 화면에는 `[검색]` Mini Search Dialog와 `[목록으로]`, 신규/복사/저장/삭제 액션을 배치했다. 검색 결과에서 프로젝트를 선택하면 결과 집합과 선택 프로젝트를 유지한 채 상세로 전환하고, 목록 복귀 시 검색 조건·Working Set·선택 상태를 유지한다. 기존 30/70 splitter와 dirty guard, 단순 복사 규칙은 유지했다.

## Working Set 후속 인수 및 최종 검증 (2026-09-20)

- 시작 기준 dev-pm/origin/dev-pm `fe5599231038a3d3edd862b4fcba622cbf7643fa`. 이전 승인 통합 `1971c50`은 이미 포함되어 있었다.
- 발견한 `codex/project-reference-refine` / `5bef92fec595337665b354ff70ab0e55d07c194b`는 clean이며 Mini Search 초안만 부분완료였다. 별도 worktree/branch `feature/project-working-set-search`로 해당 commit을 보존하여 이어받았다.
- 부분완료: Mini Search, 좌우 action 배치, 검색 결과 유지. 미착수/누락: 실행 조건과 입력 초안 분리, 중복 적용 조건 제거, 저장 시 Working Set 소속 보존, 공통 FormModal 재사용. 이번 변경에서 구현했다.
- 기존 splitter/new/copy/ID/message/Deep Copy 정책은 유지했다. 다른 작업자의 worktree, staged/unstaged/untracked 파일을 수정하거나 reset/rebase하지 않았다.
- 공통 재사용: FormModal, SearchPanel, DataTable, ActionButton. 기준 dev-pm에는 공통 resizable workspace가 없어 기존 module 전용 ProjectListDetailWorkspace를 유지했다.

### 이번 실제 UI 검증

별도 localhost:5189 origin의 QA Working Alpha/Beta를 사용했다. 기본 프로젝트는 변경하지 않았다.

| TC | 결과 |
| --- | --- |
| 01–03 | LIST 진입, 프로젝트명 상세 진입, 상세 유지 Mini Search 열기 확인 |
| 04–06 | 프로젝트명 Alpha→1건, 고객 QA Customer→2건, 상태 DRAFT→1건 확인 |
| 07–08 | 결과 선택 후 dialog 닫힘, 전체 2건 Working Set 교체, 다른 상세 선택 시 집합 보존 |
| 09–11 | drag 30→40%, collapse 목록 숨김, expand 40% 복원 |
| 12 | LIST 복귀 시 QA Customer 조건과 2건 유지. 조회 후 미실행 입력은 적용되지 않음 |
| 13–15 | 신규 빈 초안, 복사 ID 미생성/건수 불변, 저장 후 SDP-002/003 생성 |
| 16 | 고객명을 검색 조건 밖으로 수정해도 기존 2건 Working Set 유지 |
| 17 | 삭제 확인창 표시까지 확인. 이후 브라우저 제어 timeout으로 삭제 완료는 이번 회차 미확인 (이전 Phase 2 회차에서 삭제 성공 검증 이력 있음) |
| 18–19 | 1280×800: 목록 clientWidth/scrollWidth 378/378, body 1280/1280. 1440×900 레이아웃 및 빈 메시지 공간 없음 |
| 20 | 저장 성공/필수값 validation compact 표시 확인. 조회·저장 실패 강제 주입은 미검증 |
| 21 | 1440→1280 resize 확인. 짧은 높이에서 내부 scroll 및 대량 결과 scroll은 이번 회차 미검증 |

추가 확인: 초기화 전체 조회, 결과 0건, 취소 시 기존 Working Set 유지, dirty 상태에서 검색 열기/취소 후 편집 유지, 다른 상세 이동 시 미저장 확인창 표시. native confirm 취소 분기는 제어 문제로 확정하지 않았다. 테스트 QA 데이터는 검증 origin에 남겨 두었으며 원본 자료는 변경하지 않았다.

### 자동 검증 / 범위

- frontend build/lint 통과. 기존 500kB 초과 bundle 경고만 있음.
- Project 회귀 9 tests / grid adapter 18 assertions 통과.
- backend 22 tests, 실패/오류/skip 0, BUILD SUCCESS.
- git diff --check 통과.
- 변경: Project 페이지, scoped CSS, ProjectSearchDialog, projectReference 정책 함수, 회귀 테스트, ADR029/module README/current-status/본 보고서. Backend/DB/Core/다른 Lifecycle 화면 변경 없음.
- 이번 후속 작업은 feature commit/push까지만 수행한다. dev-pm merge/push는 수행하지 않는다.

## 후속 병합 승인 (2026-09-20)

사용자가 dev-pm 병합을 명시적으로 승인했다. 검증된 ddb2ac6과 동시에 추가된 dev-pm의 79f224b(공통 버튼 설정)를 feature에서 충돌 없이 통합했다. 위 미통합/병합 금지 문구는 승인 전 이력이며, 이번 승인에 따라 dev-pm 병합 및 push를 진행한다. 이전 UI 미검증 항목은 그대로 남는다.
