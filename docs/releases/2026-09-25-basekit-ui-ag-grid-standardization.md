# 2026-09-25 BaseKit 공통 UI·AG Grid 참조 구현

## 배포 상태

- 2026-09-25 `dev-pm` 반영 기준. 이 문서는 `main` 배포 또는 UI-03 Catalog 확정을 뜻하지 않는다.
- 공통코드관리는 Master 선택에 따라 속성정의와 공통코드를 함께 관리하는 3-Grid 참조 화면이다.

## 반영 내용

- **3-Grid 업무 화면:** 공통 `MasterDetailMultiGrid`에 Master·상단 Sub·하단 Detail·Message 영역을 주입한다. 기본 비율은 좌우 40:60, 우측 상하 38:62이며 Workspace 최소 높이는 520px, 하단 Message Area는 32px이다. Grid가 영역 높이를 유지하고 데이터가 넘치면 내부에서 스크롤한다.
- **Grid 편집과 저장:** 공통코드관리의 세 Grid에 AG Grid Community 기반 `BaseKitDataGrid`를 적용했다. Current Row, Checkbox 다중 선택, Inline 편집, 신규 Key 편집·기존 Key 읽기 전용, 행추가·삭제예정·변경취소·일괄 저장을 지원한다. `INSERTED`·`UPDATED`·`DELETED` 상태는 행 표시와 상태 아이콘으로 구분하고, 편집 가능 Cell·Focus·Validation 오류를 의미별 스타일로 표시한다. AG Grid의 다른 업무화면 전면 적용은 아직 결정하지 않았다.
- **Metadata 기반 입력:** 공통코드 속성정의를 `FieldDefinition`으로 변환해 데이터 타입과 Control/Display 타입에 맞는 NUMBER·SELECT·YN Switch·COLOR 입력 또는 표시와 필수값 검증을 연결했다. 고정 코드 필드의 문자 길이는 Schema Catalog에서 `maxLength`로 전달해 편집 중 길이 표시와 초과 입력 제한에 사용한다. `CODE_GROUP` OptionSource로 선택 항목을 조회한다.
- **공통 Action과 변경 보호:** `ActionButton`의 `ICON_TEXT`·`ICON_ONLY`, Tooltip, 사용자별 표시 설정을 Grid Toolbar에 적용했다. 기본 Action과 화면에서 전달한 Action 모두 `ROLE × PROGRAM × ACTION_CODE` 권한을 통과해야 표시된다. 속성정의와 공통코드는 저장한 Dataset만 재조회하므로 다른 Grid의 미저장 변경이 유지된다.
- **업무 화면 밀도:** 공통 PageHeader·SearchPanel에 Compact 규칙을 적용한 뒤 Top Navigation·검색 Control·문서센터 Toolbar까지 Ultra Compact 규칙을 반영했다. 32px Grid Row와 Inline Editor, 3-Grid 비율과 Message Area는 유지한다.
- **기반 Metadata:** Core PROGRAM 관리와 공통코드 속성정의 Metadata가 추가되어 프로그램 및 코드별 입력 규칙을 공통 UI에 전달한다.

## 검증

- Frontend Production Build와 ESLint 통과.
- 문서센터의 Repository 자동 Discovery로 기존 61건에 이 문서를 더한 62건을 확인했다. `배포공지`에서 최신순 첫 항목으로 표시되며 제목 검색과 Markdown 본문 표시가 정상이다.

## 남은 과제

- 공통코드관리 3-Grid는 UI-03 표준 승격을 위한 참조 구현이다. 최종 Catalog 등록과 다른 업무화면 적용 범위는 별도 검수·결정이 필요하다.
- 코드 속성 Metadata, `FieldDefinition`, Grid Adapter와 Form 사이의 실행경로·계약 정합성은 후속 정리 대상이다.
