# Project Inline Search 검증 (2026-09-20)

## 기준 및 범위

- 시작 HEAD/origin/dev-pm: 9b0eff5b5285bc9e8d56455d81c3bd48c767be8c. 사용 중이던 feature worktree는 staged/unstaged/untracked 모두 clean이었다.
- 새 branch feature/project-inline-search에서 작업. 기존 worktree와 dev-pm의 unrelated untracked 자료는 보존했다. reset/rebase 없음.
- ProjectSearchDialog 제거, 기존 SearchPanel을 inline으로 재사용. 상세 editor를 Working Set에서 분리. Project scoped 폼 CSS 수정.
- 공통 변경은 ActionButton `display="label"`와 SearchPanel `actionDisplay` 선택 옵션뿐이다. 기본 호출/전역 preferences/다른 화면의 배치는 변경하지 않는다.
- 공통 폼 정책과 적용 범위는 ADR029에 기록했다. 과거 인계 보고서의 Dialog 설명은 당시 이력이다.

## 자동 검증

- npm run build / npm run lint 통과. 기존 대형 bundle 경고 있음.
- Project 회귀 11개, Grid adapter assertions 18개 통과.
- npm run backend:test: 22개 통과, failures/errors/skipped 0.
- git diff --check 통과.
- 회귀에 결과 밖 dirty editor identity 유지, 결과 밖 기존 저장 미삽입, 신규/복사 삽입을 포함했다.

## 실제 브라우저 검증

별도 localhost:5191 origin에서 기본 프로젝트를 보존하고 QA Inline / QA Inline Copy 데이터를 생성하여 확인했다.

- CRUD 버튼은 신규/복사/저장/삭제 텍스트로 표시. 검색/목록으로/초기화/조회 label 표시.
- 중앙 modal 없이 검색 버튼 아래 조건만 표시하며 Grid는 기존 목록 하나만 존재.
- 프로젝트명 BaseKit, 고객명 QA Customer, 상태 DRAFT 조회와 초기화/0건 결과 확인.
- QA 상세 설명을 수정한 뒤 BaseKit으로 조회: 목록 1건, 상세 ID SDP-002와 미저장 설명 유지, 복사/저장/삭제 enabled 확인.
- 검색 접기/재열기 후 조건 유지. 결과 밖 상세 저장 후 목록은 1건 유지.
- 결과 밖 상세 복사 시 ID 미생성/자동 저장 없음, 명시적 저장 후 신규 행만 추가.
- 상세 신규 빈 폼과 필수값 오류 메시지 확인.
- splitter keyboard 30→54%, collapse/expand 후 54% 복원, 목록으로 전환과 집합 유지 확인.
- 1440×900 / 1280×450 확인. 좁힌 상세에서 모든 label 76px, input X 동일, 1열 전환 후에도 좌우 배치 유지. 검색/상세 모두 label 오른쪽에 input 위치. textarea label 상단 정렬.
- 1280 화면 body clientWidth=scrollWidth=1280, Grid 가로 overflow 없음. 짧은 높이에서 목록 내부 세로 scroll 확인.
- 의미 없는 전환 메시지 없음. 저장/필수값/검색 0건만 표시.

## 미검증 및 제약

- native window.confirm이 열리는 다른 상세 이동에서 브라우저 제어 도구의 CDP 응답이 멈췄다. getJsDialog도 대상을 반환하지 않아 dirty 취소/확인 분기와 삭제 완료는 이번 회차 실제 UI로 확정하지 못했다. 기존 confirm 정책은 변경하지 않았으며 코드와 정책 함수 회귀 검증은 통과했다.
- 조회/저장 실패의 강제 주입은 미수행. 대량 목록 성능 검증은 범위 밖이다.
- QA 자료는 별도 테스트 origin에 남아 있으며 사용자 원본 데이터는 변경하지 않았다.
- feature commit/push까지만 수행. dev-pm 병합은 사용자 검수 후 별도 승인 대상.
