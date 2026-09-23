# ADR 029: Project Management List-Detail Reference UX

## 상태

Accepted / Working Set까지 dev-pm 통합 / Foundation UI 정리는 feature 검수 대기

## 범위

Standard Design Product Module의 **프로젝트 관리** 화면을 기준 UI로 삼고, WBS·요구사항·화면 설계·DB 설계에는 Page Header의 Project Context와 Action 정렬 규칙만 적용한다. 데이터 권한, 업무 기능 확장, 표준용어, LLM, Backend/DB Migration, 메뉴·버튼 권한 Framework, Template 관리와 Generator에는 적용하지 않는다.

## 배경

프로젝트 관리는 설계 Lifecycle의 진입점이지만, 기존 화면은 고정 폭 List/Detail, 별도 `목록 접기` 버튼, 상시 32px 메시지 영역을 사용했다. 조회 후 상세 편집으로 이어지는 업무 흐름에서 검색조건·결과 맥락·선택 대상을 유지하고, 가용 폭과 메시지 공간을 실제 데이터·입력 영역에 배분하는 기준 UX가 필요하다.

## 결정

### 1. 목록-상세 Layout

- `LIST`는 목록만 100% 폭으로 표시한다.
- 상세 진입 시 기본 List/Detail 비율은 30/70이다.
- List와 Detail 사이에는 pointer drag와 키보드 좌/우 화살표로 조절 가능한 세로 splitter를 둔다.
- splitter는 유용한 목록·상세 최소 폭을 지키며, List 폭은 페이지가 유지되는 동안 기억한다.
- splitter 내부 control은 Detail에서 `DETAIL_EXPANDED`로 목록을 접고, 확장 상태에서 `DETAIL`로 복원한다. 복원할 폭이 없으면 기본 30%를 사용한다.
- 상세 진입 뒤 Master 영역은 현재 Working Set을 계속 표시한다. 목록 접기와 펼치기는 splitter에서만 제어하며 별도 `목록으로` toolbar를 두지 않는다.
- Detail은 100% 확장 상태와 내부 scroll을 지원하며, List Grid도 자체 scroll을 유지한다.

현재 작업 기준 commit과 최신 확인된 `origin/dev-pm`에는 `ListDetailWorkspace` 또는 resizable split-pane 공통 컴포넌트가 없다. 별도 미통합 branch `caronkwon-dotcom-feature-basekit-list-detail-layout`의 `4e8cf29`에는 고정 비율 공통 컴포넌트가 있으나 이번 범위에 병합하지 않는다. 따라서 `ProjectListDetailWorkspace`는 Standard Design Module 내부의 Project 전용 구성으로 두며, 다른 Program에서 같은 contract가 실제로 반복되기 전에는 Core 공통 컴포넌트로 승격하지 않는다.

### 2. Header, Action, Message

- Breadcrumb만 유지하고 중복 Project Context와 적용 조건 배너는 제거한다.
- `LIST` Page Header action은 `신규`만 표시한다. 상세 Page Header 오른쪽에는 `신규`, `복사`, `저장`, `삭제`를 같은 높이와 간격으로 표시한다. 상세 Master의 제목·건수 옆에는 `검색`만 표시하며 접힌 목록은 splitter에서 복원한다.
- 검색은 기존 `SearchPanel`의 조회·초기화 action rail을 사용한다.
- 메시지가 없으면 메시지 영역을 렌더링하지 않아 고정 빈 공간을 만들지 않는다.
- 저장·삭제 성공, validation·조회·저장·삭제 오류처럼 업무적으로 의미 있는 결과만 INFO/WARN/ERROR/SUCCESS tone과 icon으로 표시한다. 단순 선택, 상세 열기, 목록 복귀 전환 문구는 표시하지 않는다.

### 3. 검색, 선택, Grid

- 프로젝트명, 고객명, 상태는 입력 중 조건과 마지막 조회에 적용된 조건을 분리해 유지한다.
- 적용 조건·결과 건수·선택 대상은 조회 → 상세 → 목록 접기/펼치기 → 목록 복귀 동안 유지한다.
- 목록의 단일 선택은 행 강조로 표시한다. 다중 작업 action이 없는 이 화면에서는 checkbox column을 두지 않는다.
- 기본 30% List pane에서 불필요한 가로 scroll이 생기지 않도록 ID·상태는 compact fixed width로, 프로젝트명·고객명은 ellipsis와 tooltip을 제공하는 가변 폭으로 둔다. 우선순위는 프로젝트명, 고객명, ID, 상태 순서다.
- 프로젝트명은 keyboard 접근 가능한 action link로 상세를 연다.

### 3a. Inline Search와 Working Set

- LIST 화면과 상세 Master는 동일한 Inline Search와 목록 Grid를 사용한다. 상세 Master의 `검색`은 Grid 상단 검색영역만 펼치거나 접으며 별도 Dialog나 결과 Grid를 만들지 않는다.
- 검색조건과 실행 조건을 분리한다. 조회는 왼쪽 Working Set만 교체하며 오른쪽 상세·미저장 입력·선택 ID를 변경하거나 자동 저장하지 않는다.
- 현재 상세가 조회 결과에 없으면 왼쪽 선택 행은 없다. 저장된 상세의 identity와 기본정보는 editor에서 유지하므로 복사/저장/삭제는 계속 가능하다.
- 검색영역 열기·접기·조회는 편집 내용을 버리지 않는다.
- Working Set은 마지막 실행 조회의 스냅샷이다. splitter/상세/목록 전환으로 재조회하거나 재필터링하지 않는다. 기존 항목 저장은 위치와 소속을 유지한다. 결과 밖 기존 상세 저장은 집합에 추가하지 않는다. 신규/복사 저장만 새 행을 추가한다. 삭제는 해당 행이 집합에 있으면 제거한다.
- 초기화는 빈 조건으로 전체 조회한다.
- SearchPanel의 조회/초기화는 Project 화면에서 label로 표시한다. Enter 조회와 기본 Tab 순서를 지원한다.

### 3b. 필드 배치와 버튼 표시

필드명은 왼쪽, 입력칸은 오른쪽으로 통일한다. 화면 폭에 따라 한 행의 필드 개수만 조절하며, 필드명과 입력칸의 좌우 관계는 유지한다.

- Project 검색/상세의 label 너비는 76px로 동일하다. textarea label은 왼쪽 상단에 배치한다. 긴 label은 자기 영역 안에서 줄바꿈하며 입력칸 시작 위치는 유지한다.
- 신규/복사/저장/삭제와 검색/목록/초기화/조회는 텍스트로 구분한다. 신규와 복사에 동일한 + 아이콘을 표시하지 않는다.
- ActionButton의 선택적 `display="label"`, SearchPanel의 선택적 `actionDisplay`만 추가한다. 생략한 기존 호출은 기존 사용자 설정과 동작을 유지한다.
- 이 폼 원칙은 공통 정책으로 문서화하지만 CSS 구현은 Project 화면에만 한정한다. 다른 업무 화면의 적용은 별도 범위다.

### 4. 신규, ID, Copy

- `신규`는 저장 전까지 Repository에 기록하지 않는 편집 초안을 연다.
- 기존 ID는 compact label-value로 표시한다. 신규와 복사 초안은 `ID: 신규 저장 시 생성`만 표시하고 editable input이나 Repository ID를 만들지 않는다.
- 프로젝트명, 고객명, 설명, 상태 변경 초안이 있으면 신규·복사·다른 상세·목록 복귀 전에 최소 확인을 요청하고 browser unload도 경고한다.
- `복사`는 **SIMPLE_COPY**다. 현재 프로젝트의 프로젝트명, 고객명, 설명, 상태만 새 초안으로 복사하며 `PROJECT_ID`, 생성 식별자, relation data는 복사하지 않는다. 명시적 저장이 새 프로젝트를 만든다.

### 5. 향후 DEEP_COPY 원칙

**DEEP_COPY**는 Master와 relation table을 함께 복사하는 별도 기능이다. 구현하려면 다음을 모두 갖춰야 한다.

1. 대상 relation 범위와 누락·제외 기준을 화면에서 명확히 고지한다.
2. 사용자가 relation 수와 영향 범위를 확인한 뒤 명시적으로 확인한다.
3. Master·관계 데이터를 하나의 transaction으로 저장한다.
4. 모든 새 Master/관계 식별자를 생성한다.
5. 기존 relation ID 참조를 새 ID로 재구성하고 무결성을 검증한다.

이 Reference UX에는 DEEP_COPY를 구현하지 않는다.

## 결과

Project Management는 BaseKit의 List-Detail reference UX로 사용하되, 이 문서의 좁은 범위 밖 화면에 자동 적용하지 않는다. 공통화는 반복 사용과 API 계약이 확인된 후 별도 ADR로 결정한다.

Project Detail의 기본정보는 상단 compact form으로 한정하고 Project Member Grid가 남은 높이를 사용한다. Project ID는 header badge/text로 표시한다. WBS·요구사항·화면 설계·DB 설계의 Page Header는 설명문을 제거하고 `화면명 / Project Context / Action`만 한 줄로 구성한다.

## 인계 검증 보완

- Splitter 12px을 제외한 가용 폭으로 최소 폭을 계산하고 ResizeObserver로 컨테이너 변화를 반영한다. 좁은 컨테이너는 비례 배분한다.
- 접기/펼치기 버튼을 separator의 형제 요소로 분리해 보조기기에서도 버튼으로 노출한다.
- 수정하지 않은 복사 초안도 미저장 상태로 보호한다. 신규 ID는 저장 직전 Repository 데이터로 계산한다.
- 상세 검증 결과와 통합 주의사항: [인계 보고서](../project-reference-handoff.md).
