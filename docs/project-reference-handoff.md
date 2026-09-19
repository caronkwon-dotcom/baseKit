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
