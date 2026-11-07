# ADR 043: SD 프로젝트 관리 화면을 공통 Master/Detail 구조로 전환

- 일자: 2026-11-07
- 상태: PM 추천안 승인(BK-SD-PROJECT-UI-001), ai-sd 구현·로컬 검증 완료, dev-pm 통합 전
- 관련: [ADR 039](039-sd-project-master-postgresql.md), [ADR 041](041-sd-screen-design-menu.md)

## 문제
프로젝트 관리 화면은 SD 전용 `ProjectListDetailWorkspace`와 `DataTable`을 썼다. 워크스페이스와 래퍼는 flex로 끝까지 늘어나지만 HTML 표는 행 수만큼만 높이를 가져, 행이 적거나 모니터가 클수록 목록과 멤버 영역 아래가 비었다(실측: 1920×1080에서 멤버 래퍼 711px에 표 66px). 첫 화면이 전체폭 목록이라 한 번 더 눌러야 상세가 열렸다.

## 결정
1. 공통 `MasterDetailMultiGrid` + `BaseKitDataGrid`를 쓴다. 좌 목록, 우 상단(38%) 기본정보 폼, 우 하단(62%) 프로젝트 멤버 그리드, 하단 32px 고정 메시지 영역(`BaseKitMessage`). 검색은 페이지 상단 고정 `SearchPanel`(프로젝트명·고객명·상태).
2. **첫 목록 화면을 없앤다.** 진입 시 목록 조회가 끝나면 프로젝트 컨텍스트에 선택된 프로젝트 → 없거나 목록에 없으면 첫 행 → 0건이면 신규(NEW) 편집 모드로 연다. 목록이 로딩 중이거나 서버 오류면 아무것도 선택하지 않고 안내만 표시하며 신규 모드도 열지 않는다. 자동 선택된 프로젝트는 프로젝트 컨텍스트가 된다. 삭제 후에는 그 자리의 다음 행(없으면 이전 행, 없으면 신규)을 연다.
3. 프로젝트 관리만 새 파일 `ProjectManagementPage.tsx`로 분리했다. 공유 `ProjectListDetailWorkspace`와 그 CSS는 수정하지 않아 요구사항 관리·요구사항 그룹 화면은 변하지 않는다. CSS는 `standardDesign.css`에 `sd-project-mgmt-*` 신규 클래스만 추가했다.
4. 기능은 그대로 보존한다: 등록·수정·삭제·복사, 낙관적 락(`VERSION`), 미저장 확인(`window.confirm`, `beforeunload`), 멤버 추가·수정·삭제와 다이얼로그, ADMIN 권한 행. 신규·복사 모드의 멤버 영역에는 "저장 후 등록" 안내를 둔다.
5. **목록 폭 조절·접기는 이 화면에서 없어진다**(공통 일반 모드에 없음, 목록은 공통 기본 폭). 필요하면 공통 요청으로 올린다.
6. 공유 그리드가 한 번의 클릭을 행 클릭과 셀 클릭으로 두 번 알리므로, 화면에서 같은 행의 연속 호출을 한 번만 처리한다(안 하면 미저장 확인창이 두 번 뜸).

## 데이터 저장 위치(변경 없음)
프로젝트 본체는 서버 `BSDPROJ`. 프로젝트 멤버·멤버 마스터는 브라우저 localStorage(`basekit.standard-design.lifecycle.v1`)이며 서버 이전은 별도 단계(P3)다.

## 공통 수정 후보(구현하지 않음)
일반 모드 `MasterDetailMultiGrid`의 좌우 splitter·접기, `BaseKitDataGrid`의 선택 체크박스 열 숨김 옵션, `BaseKitDataGrid`의 중복 `onRowClick` 호출.
