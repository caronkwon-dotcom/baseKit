# DESIGN 검토 결과 — Grid 상태/유형 및 Endpoint 보조 Toolbar

- 검토일: 2026-10-05
- 기준: `design-work` / `40040d25cf7189e9a184ca947d2935e12ea8e9d3`
- 상태: DESIGN 문서 검토 완료 / 권장안 인계 준비 / 구현 및 실제 UI 승인 미완료
- 범위: DESIGN 산출물만 변경. 공통 코드, 화면 코드, API/DB, ADR 승인 상태는 변경하지 않는다.
- 근거 문서: [작업지시](DESIGN-grid-badge-task.md), [ADR 025](../../decisions/025-data-table-grid-layout-standard.md), [ADR 026](../../decisions/026-metadata-field-rendering-contract.md), [ADR 027](../../decisions/027-master-detail-multi-grid-layout.md), [ADR 030](../../decisions/030-action-button-preferences-message.md), [지원 해상도](../../decisions/009-supported-resolution-and-crawl-policy.md).
- 확인 방법: 기준 SHA의 소스/공통 CSS/메타데이터와 문서를 대조했다. 원 대화의 첨부 이미지, 실행 화면 측정은 확보되지 않았으므로 아래 Before/After는 소스 기준 비교 및 설계안이다.

## 1. 현재 구조와 소유권 판정

| 대상 | 실제 근거 (저장소 경로) | 판정 |
| --- | --- | --- |
| Source 상태 | frontend/src/pages/ProgramManagePage.tsx의 statusColumn/badgeField: AVAILABLE, NEW, MISSING_SOURCE, 중앙 정렬 112px | 값·컬럼 정의는 화면 전용 |
| 프로그램 유형 | frontend/src/adapters/programFieldAdapter.ts의 PROGRAM_TYPE_CODE: SELECT + BADGE, 공통코드 label 사용. ProgramManagePage의 조회 전 fallback은 SELECT + TEXT | 정상 조회 후 Badge, fallback은 텍스트. 화면 매핑 소유 |
| Action Type | ProgramManagePage의 ACTION_TYPE: COMMON/CUSTOM, BADGE, 중앙 정렬 90px | 화면 분류값; Source 상태와 별도 의미 |
| 실제 Badge renderer | frontend/src/components/grid/gridColumnAdapter.tsx의 renderMetadataValue/toGridColumns: BADGE는 metadata-badge. 해당 field renderer가 column.render보다 우선 | 공통. 화면 render만 바꿔도 BADGE 분기가 우선하므로 해결되지 않음 |
| Badge CSS | frontend/src/styles.css의 .metadata-badge: inline-block, radius 10px, padding 2px 7px, 11px, weight 800 | 전역 공통 CSS. Grid 외 영향도 확인 필요 |
| Grid metric/정렬 | frontend/src/components/grid/BaseKitDataGrid.tsx 및 basekitGrid.css | 공통 |
| Title/총건수/metrics/Action | frontend/src/components/common/ProgramDataGrid.tsx 및 ActionButton.tsx | 공통. 현재 options 삽입 slot은 없음 |
| Select | MetadataForm.tsx의 standard-form-grid, styles.css의 search-grid/metadata-toolbar select | native select에 공통 스타일 적용. 독립 BaseSelect 컴포넌트는 공통 컴포넌트 목록에서 확인되지 않음 |
| Endpoint/버튼 권한 그룹 | 기준 SHA의 ProgramManagePage는 stacked Program + Action Grid이며 detailBottom=null. Endpoint Grid/세 옵션/좌우 권한 그룹 구성 없음 | 해당 화면의 renderer/CSS 소유권은 미판정. 작업지시의 문제 설명은 요청 근거이며 현 소스의 구현 사실과 구분 |

**판정:** Badge 표현 보완은 COMMON이 필요하다. 화면 구현팀은 상태·유형 매핑과 후속 Endpoint 조합을 맡는다. Endpoint 전용 CSS가 이미 있다는 판단이나 화면 구현 완료 판단은 하지 않는다.

## 2. 유지할 실제 공통 규격

| 항목 | 기준 SHA 값/계약 | DESIGN 적용 |
| --- | --- | --- |
| Grid header / row / font | 34px / 32px / 12px (BaseKitDataGrid theme) | 유지. Badge 때문에 행·헤더를 키우지 않음 |
| Grid Toolbar | min-height 38px; padding 4px 8px 3px 12px; gap 12px | 유지. min-height와 실측 border-box 높이는 구분 |
| Title / 총건수·metric | h2 13px; 총건수·metric 12px; heading gap 12px | 기존 그룹/표현 재사용. UNMAPPED는 metrics로 표시 |
| Action | grid-actions gap 5px, 자식 button min-height 28px | 공통 Grid 안에서는 .action-button의 30px token보다 후순위 규칙으로 28px 최소 높이가 적용됨. 실측 높이는 내용·테두리까지 확인 |
| compact / search control | --control-height-compact 30px / --search-control-height 26px | 검색 26px를 Toolbar에 일괄 적용하지 않음 |
| 기존 Toolbar Select 참고 | metadata-toolbar select: min-height 28px, radius 5px, padding 0 7px, border-strong, surface-panel | COMMON이 Grid 옵션 용도로 공통화할 참고 패턴. metadata-toolbar 전체를 중첩하지 않음 |
| Form Select 참고 | standard-form-grid: min-height 32px, padding 6px 8px, radius 6px | 폼 규격. Grid Toolbar에 폼 행째 넣지 않음 |
| Workspace/scroll | ADR 027의 가용 높이, min-height:0, Message 32px; 컬럼 fixed/flex, 내부 스크롤 | 기존 stacked 화면 구조와 row state/선택/편집 동작 유지 |

## 3. 상태 Badge / 유형 Label 권장안

### 상태

- SOURCE_STATUS는 읽기 전용 semantic compact badge. AVAILABLE는 등록됨(info 계열), NEW는 미등록 Source(info 계열), MISSING_SOURCE는 Source 없음(warn 계열)으로 구분한다. 신규 등록 사실과 신규 Source 발견을 혼동하지 않는다.
- label은 업무팀이 확정하되 원 코드도 Tooltip/접근 가능한 전체 설명으로 확인 가능하게 한다. AVAILABLE/NEW를 같은 info tone으로 두어도 문구로 반드시 구분한다.
- 후보 palette는 기존 --message-info-bg/text와 --message-warn-bg/text. 성공 전용 palette는 현 CSS에 별도로 없으며 success도 info를 재사용한다. NEW를 저장 성공으로, MISSING_SOURCE를 삭제 예정으로 표현하지 않는다.
- --grid-state-inserted/updated/deleted는 Batch 행 상태 전용이다. SOURCE_STATUS Badge 의미색으로 연결하지 않는다.

### 유형

- PROGRAM_TYPE_CODE와 ACTION_TYPE은 neutral label. 기본안은 배경 없는 옵션 label 텍스트, --text-secondary, Grid font 상속이다. 상태보다 약한 강조이며 유형별 semantic 색을 만들지 않는다.
- 기존 Select editor와 공통코드 options의 value/label 계약을 유지한다. 메타데이터 정상 조회 및 fallback에서 동일한 중립 표현을 목표로 한다.
- 프로그램 유형의 기존 좌측 정렬, Action Type의 중앙 정렬을 보존한다. 유형값을 바꾸거나 데이터 코드를 번역하여 저장하지 않는다.

### 셀 안의 크기·정렬

- 작업지시의 20~22px / radius 4~6px는 확정 token이 아니다. 권장 목표는 **20px 시각 높이, 기존 공통 4px radius 활용**이며 신규 표준 숫자는 COMMON 확인 후 확정한다. 기준 32px 행에서 위아래 균등한 여유를 확보하고 줄 높이·padding·border 합계를 측정한다.
- 좌우 여백은 기존 Badge 7px를 상한 참고로 최소화한다. 기본 cell padding, column width/minWidth/flex와 정렬 class를 유지한다.
- Badge 내부는 한 줄, 자연 폭, max-width는 셀 가용 폭 이내, 고정 최소 폭 없음. absolute/음수 margin/행 밖 위치 보정 금지.
- 긴 영문 MISSING_SOURCE와 긴 유형 label은 말줄임과 기존 Tooltip을 유지한다. adapter Tooltip은 현재 raw value이므로 label까지 제공할 필요는 COMMON 검토 항목이다.
- hover/current/selected/focus/INSERTED/UPDATED/DELETED 배경 위에서도 문구·focus 표시가 읽혀야 한다. Batch 상태 아이콘, 삭제 취소선·opacity는 그대로 둔다.
- .metadata-badge 전역을 단순 축소하지 않는다. Grid 범위의 compact 표현과 기존 비 Grid BADGE 영향 범위를 COMMON이 검토한다. 신규 semantic 표현 역할의 API 형태는 이 문서에서 확정하지 않는다.

## 4. Endpoint 보조 Toolbar 권장안

현재 ProgramDataGrid에는 Title/metrics와 Action만 있고 옵션 slot이 없다. COMMON에 이 구조 안에서 옵션을 조합할 최소 확장을 요청한다. 별도 폼을 Grid 앞에 붙이거나 전용 CSS로 위로 당겨 맞추지 않는다.

기본 배치 (후속 Endpoint 화면에 적용할 설계안):

```text
좌측: [버튼 권한 그룹 Title + 총 N건]                         [Actions]
우측: [Endpoint Title + 총 N건 + UNMAPPED N건] [옵션 그룹]    [Actions]
      옵션 그룹 = [표시 label + Select] [선택 Program 연결] [추가 권한 label + Select]
      Actions   = [새로고침] [Program 연결] [연결해제]
      ─────────────── 양쪽 Grid header 시작선 동일 ───────────────
      header 34px / row 32px / Grid 내부 scroll
```

- Title/총건수/UNMAPPED는 heading group, 옵션은 왼쪽 보조 group, 실행은 우측 grid-actions. heading 정보와 입력을 같은 의미로 합치지 않는다.
- '선택 Program 연결'이 Select인지 checkbox인지 실제 화면 계약이 없다. 컨트롤 종류·선택 범위는 화면 구현팀이 확인한다. 문구만으로 boolean을 Select로 변경하지 않는다.
- native select 자체를 금지하지 않는다. BaseKit도 native select를 사용한다. **스타일 미적용 상태**를 금지하고 공통 Toolbar control 스타일, 색, 테두리, padding, focus를 적용한다.
- Toolbar 옵션 Select는 기존 metadata-toolbar의 28px 최소 높이/5px radius/0 7px padding을 참고하여 Grid Action과 중앙 정렬한다. 공통 옵션 label은 기존 toolbar label 패턴을 따르고 폼의 세로 label 행을 추가하지 않는다.
- 기존 Toolbar 바깥 padding/gap은 유지한다. 옵션 그룹의 내부 gap은 기존 5px/8px 패턴 중 COMMON이 통일하며 화면별 새 숫자를 만들지 않는다.
- Select는 짧은 선택값에 필요한 자연 폭을 사용한다. 긴 Program option은 가용 폭에서 줄일 수 있게 하고 Action이 밀리지 않게 한다. native select의 선택값 ellipsis는 브라우저별 차이가 있어 동작을 가정하지 말고 전체 값 title/접근성 설명과 펼친 option으로 확인한다.
- 총건수는 해당 Grid rows.length 기준, UNMAPPED 집계 범위는 화면팀이 확인한다. 화면에 0건이어도 Title/Toolbar/header/Message 공간을 유지한다.
- 새로고침/연결/해제는 기존 ActionButton과 Grid 권한 필터를 재사용한다. Action code와 대상 선택 조건은 화면팀 소유이며 권한 없는 실행을 일반 button으로 우회하지 않는다.

### 폭 부족과 좌우 정렬

- 1920×1080, 1440×900, 1280×800에서 두 버튼 표시 모드(ICON_TEXT/ICON_ONLY)로 확인한다. 모든 정보를 우측 좁은 Grid 한 줄에 넣을 수 있다고 가정하지 않는다.
- 먼저 Title·선택값만 수축/말줄임하고 총건수·UNMAPPED·Action 식별 및 접근 가능한 label을 유지한다. 버튼 모드를 폭 때문에 임의로 강제하지 않는다.
- 한 줄로 불가능하면 양쪽 Grid 공통 상단 레이아웃에서 **동일한 두 행 높이를 예약**하는 대안을 COMMON 검토로 넘긴다. 첫 행 Title/metrics/Actions, 둘째 행 옵션; 좌측도 같은 둘째 행 공간을 공통 구조로 확보한다. 우측만 자동 wrap하거나 화면 전용 빈 margin을 넣지 않는다.
- 두 행 대안은 기존 공통 기능이 아니므로 구현 완료로 표시하지 않는다. 추가 높이·가용 본문 영향은 COMMON이 측정 후 확정한다.
- 지원 최소 폭 아래에서는 ADR의 업무 최소 폭/가로 스크롤 정책을 따른다. 옵션 clip, Action 숨김, 본문 높이 축소로 맞추지 않는다.
- 같은 Detail 행에서 Section top, Title baseline, 총건수 baseline, Toolbar bottom, header top, 첫 데이터 row top을 맞춘다. 수직 차이는 목표 0px이며 실제 browser 좌표로 검수한다.
- 하단 scrollbar는 데이터 유무 때문에 실제로 한쪽만 나타날 수 있다. 같은 viewport bottom과 스크롤 공간 정책을 확인하고 scrollbar를 강제로 늘리지 않는다.

## 5. Before / After 비교

| 프로그램관리 기준 | Before: 기준 SHA 소스 | After: DESIGN 권장안 |
| --- | --- | --- |
| Source 상태 | AVAILABLE/NEW/MISSING_SOURCE 모두 동일 metadata-badge, 10px radius, weight 800 | 셀 내부 compact badge, 의미 문구 + 기존 info/warn palette |
| 프로그램 유형 | 정상 metadata: BADGE; 조회 전 fallback: TEXT | 둘 다 neutral label, options label/Select 편집 유지 |
| Action Type | COMMON/CUSTOM이 Source 상태와 같은 Badge | 중립 분류 label, 중앙 정렬 유지 |
| row/header | 32px/34px | 동일 |
| Title/총건수/Actions | ProgramDataGrid 공통 Toolbar | 동일 계약 |
| Endpoint 옵션 | 기준 화면에 없음; 요청상 별도 폼·좌우 불일치 | 공통 Toolbar 옵션 조합 + 좌우 같은 상단 높이; 실제 화면 확보 후 검수 |

이는 실행 전후 캡처가 아니다. Endpoint Before의 시각 문제는 작업지시에서 전달받은 내용이며 기준 코드에서 재현하지 않았다.

## 6. COMMON / 화면 구현팀 전달 항목

| ID | 전달 대상 | 요청 / 완료 조건 |
| --- | --- | --- |
| C-01 | COMMON | Grid BADGE compact 표현과 semantic/neutral 역할 분리 검토. 기존 FieldDefinition/ADR 026 호환 유지, 기존 BADGE 기본 동작 및 비 Grid 사용처 회귀 영향 목록 제출 |
| C-02 | COMMON | cell alignment/한 줄 overflow/label+raw Tooltip 검토. SELECT+BADGE가 column.render를 우선 차단하는 현재 경로를 고려해 공통 렌더링 확장 방식 제시 |
| C-03 | COMMON | ProgramDataGrid heading/metrics/권한 Action을 보존하는 옵션 삽입 계약과 Toolbar Select 공통 스타일 검토. native select 유지 가능 |
| C-04 | COMMON | 폭 부족 시 동일 두 행 상단 높이 대안 및 측정 결과. 기존 row/header, --multi-grid-* 및 Message metric 불변 확인 |
| P-01 | 프로그램관리 구현팀 | SOURCE_STATUS 세 값의 label/tone, PROGRAM_TYPE_CODE/COMMON/CUSTOM neutral 역할, fallback 표현 매핑. 저장 값·Select 편집·Batch 상태는 유지 |
| P-02 | Endpoint 화면 구현팀 | 실제 branch/SHA·파일·화면 확보, 세 옵션의 control 종류·집계 범위·연결 대상 확인. renderer/CSS 소유권을 증거로 재판정 |
| P-03 | Endpoint 화면 구현팀 | COMMON 확장 승인 후 옵션/Action 조합 및 권한/선택 disabled 적용. 0건/긴 값/미선택에서도 좌우 시작선 검수 |

전달 여부: **COMMON 및 화면 구현팀에 전달 필요; 인계 항목 문서화 완료.** 별도 채팅/Issue 전송은 수행하지 않았다. 공통 기능이 없는 상태에서 화면팀 임시 CSS로 우회하지 않는다.

## 7. 후속 검수와 보류

| 검수 | 수용 기준 | 현재 |
| --- | --- | --- |
| 소스 근거·소유권 | renderer/CSS/metadata/Toolbar 경로와 근거 SHA 명시 | 완료 |
| 문서 범위 | DESIGN 문서만 변경, 코드 구현 없음 | 완료 |
| Badge 시각 | 3개 Source 상태 + 긴 유형, 32px row 안에서 중앙/기존 정렬 유지 | 구현 후 검수 |
| 상태 공존 | hover/selected/current/focus + Batch 4상태, skin 전환 | 구현 후 검수 |
| Toolbar | 0/1/다수건, 긴 Program option, 권한 없음/미선택/disabled, 키보드 focus | 실제 Endpoint 확보 후 검수 |
| 좌우 metric | 지원 해상도·버튼 2모드에서 header/row top 차이 0px, viewport bottom 안정 | 실제 Endpoint 확보 후 측정 |

보류:
1. 원 첨부 이미지와 실제 Endpoint 구현 SHA/파일이 없어 해당 영역 현황·control 종류·소유권 및 Before 캡처 미확인.
2. Badge compact metric과 semantic 표현 API, 공통 옵션 slot/두 행 fallback은 COMMON 설계·구현 검토 전 권장안이다.
3. 브라우저 시각·접근성·skin 검수는 미실시. 문서 검토 완료를 구현 완료나 화면 승인으로 간주하지 않는다.
4. build/lint/backend:test는 실행하지 않았다. DESIGN 문서만 변경하며 로컬 Git HTTPS helper도 없어 connector로 저장소를 확인했다. 변경 문서의 링크·공백·파일 범위와 원격 반영을 검증한다.
