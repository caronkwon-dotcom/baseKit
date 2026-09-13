# ADR-027 Master-Detail Multi-Grid Layout Standard

- 상태: 승인 / 구현
- 범위: BaseKit Core/Shared UI

## 결정

한 화면에서 Master와 복수 Detail Grid를 동시에 다루는 관리화면은 공유 `MasterDetailMultiGrid` 구조를 사용한다.

- 좌우 기본 비율: Master 40%, Detail 60%
- Detail 상하 기본 비율: 상단 38%, 하단 62%
- 전체 최소 높이: 520px
- 상단 Detail 최소 높이: 180px
- 하단 Detail 최소 높이: 240px
- 공통 Message Area: 32px를 항상 확보해 메시지 발생 시 Grid가 움직이지 않게 한다.
- Grid는 데이터 건수가 아니라 가용 Workspace 높이를 채우며, 초과 데이터는 각 Grid 내부에서 스크롤한다.
- Workspace, Page, Grid는 `flex`, `min-height: 0`을 사용하고 페이지별 viewport 고정 높이를 두지 않는다.
- 위 값은 `--multi-grid-*` 공통 UI Token으로 관리하며 개별 업무 Page에서 재정의하지 않는 것을 기본으로 한다.

## 적용

공통코드관리는 `코드그룹 Master / 속성정의 Detail Top / 코드목록 Detail Bottom`으로 구성한다. Metadata 동적 컬럼과 Form 계약은 변경하지 않는다.
