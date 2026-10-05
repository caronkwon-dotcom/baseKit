# COMMON 요청 — Endpoint 옵션 삽입과 좌우 Toolbar 정렬

2026-10-05 · 최신 dev-pm a928069 기준 · 상태: 요청 문서화, 공통 확장 미구현.

## 현재 구조 → 문제

ProgramManagePage의 program-endpoint-controls는 ProgramDataGrid 앞에 있다. ProgramDataGrid에는 heading/metrics/권한 필터가 적용된 Actions/renderTable만 있고 option slot이 없다. 따라서 기존 props만으로 옵션을 Toolbar 내부에 넣을 수 없다.

실제 Chrome 1920/1440/1280과 두 버튼 모드에서 좌우 Grid header 차이 36px. Select의 공통 스타일과 Title/Action 표현 보정은 DESIGN이 직접 완료했으나 구조 정렬은 남아 있다.

## 선택지 → 추천

1. 공통 Grid에 선택형 option 삽입 계약을 제공한다. 기본 호출은 기존 높이·권한·동작 유지.
2. renderTable로 Toolbar 전체를 복제하거나 화면 CSS로 위로 당긴다: 공통 계약과 사용자 요구를 위반하므로 적용하지 않는다.

추천은 1이다. COMMON이 최소 연결점을 제공하고 DESIGN이 두 기존 Select를 기존 handler 그대로 조합한다. MAPPED/UNMAPPED/ALL 필터와 추가 GROUP_CODE 의미, metrics 집계, Action Code/권한 필터와 disabled 조건은 유지한다.

## 영향 범위와 수용 기준

- ProgramDataGrid/BaseKitDataGrid 공통 계약과 MasterDetailMultiGrid의 동일 Detail 행 정렬을 확인한다. 옵션 없는 기존 화면은 기본 레이아웃 유지.
- 한 줄이 부족하면 양쪽 동일한 두 행 Toolbar 공간을 제공한다. 한쪽만 wrap하거나 임의 빈 margin을 넣지 않는다.
- 좌우 Title/총건수 baseline, Toolbar bottom, header/첫 row 시작선 차이 0px. 1920/1440/1280 × ICON_TEXT/ICON_ONLY, 긴 Program/옵션, 0건/미선택/다수건을 검수한다.
- row/header 32px/34px, Message 32px, splitter, 가용 높이, 내부 scroll, 고정/flex 컬럼, hover/selected/focus 유지.
- native select에 기존 basekit-toolbar-control 적용. API/DB/권한·업무 데이터 변경 없음.

COMMON 구현 후 DESIGN이 직접 프로그램관리 옵션 배치·spacing을 마무리하고 브라우저 재검수한다. 문서 인계만으로 DESIGN 완료하지 않는다. 별도 채팅/Issue 메시지는 발송하지 않았으며, 이 요청은 저장소 산출물이다.

## 이번 요청으로 해결 (2026-10-05)

사용자가 최소 공통 확장 구현을 명시적으로 허용했다. ProgramDataGrid에 선택형 `toolbarOptions` 및 `toolbarLayout`을 추가했다. BaseKitDataGrid는 기존 props 전달 구조로 이를 지원한다. `toolbarLayout="two-row"`는 첫 행 Title/총건수/metrics/Actions와 둘째 행 옵션을 제공한다. 기본 호출은 기존 single-row다.

MasterDetailMultiGrid의 resizable stacked 구성에서 `alignDetailToolbars`를 켜면 직계 Detail Grid들이 공통 subgrid track을 공유한다. 옵션 줄바꿈 시에도 양쪽 Toolbar 하단과 Grid header를 같은 높이에 놓는다. 화면 전용 margin/absolute/음수 보정·Toolbar 복제·API/권한 변경은 없다. 이 옵션은 직계 Grid 두 개를 사용하는 resizable stacked 구성용이며 기존 레이아웃에는 적용하지 않는다.

현재 지원 해상도 Chrome fixture 검수와 divider 조절에서 좌우 header 차이 0px. COMMON 추가 구현 대기는 해소했다. 향후 다른 Grid에 이 계약을 적용하거나 구형 브라우저를 지원할 때는 COMMON 영향 검토가 필요하다.
