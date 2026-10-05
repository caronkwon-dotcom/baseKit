# DESIGN 작업지시 — Grid 상태/유형 Badge 및 Endpoint 상단 컨트롤 표준 보완

작성일: 2026-10-05
기준 브랜치: `design-work`
대상: BaseKit Grid 내 상태(Status) / 유형(Type) 값 표현 및 Grid 상단 보조 컨트롤 배치
참고 화면: 시스템관리 > 프로그램관리

DESIGN 검토 결과: [DESIGN-grid-badge-review.md](DESIGN-grid-badge-review.md)

검토 상태: 기준 SHA 소스 대조 완료 / 구현·시각 승인 대기. 아래는 원 작업 요구이며 실제 소스 근거, 권장 metric, native Select 재사용 및 Endpoint 미구현 범위는 연결된 검토 결과를 우선한다.

## 1. 목적

프로그램관리 화면의 Grid에서 `상태(AVAILABLE / NEW)`와 `유형(목록 / 목록·상세 / 홈 등)` 값이 셀 내부 데이터라기보다 셀 위에 별도 라벨이 떠 있는 것처럼 보여 BaseKit Grid의 밀도와 정렬 규칙이 깨져 보인다.

또한 Endpoint 목록 상단의 `표시`, `선택 Program 연결`, `추가 권한` Select/Combo 영역이 별도의 폼처럼 배치되어 좌측 권한 그룹 Grid와 수평 규격, 높이, 여백이 맞지 않고 화면 전체 Master/Detail 정렬이 어긋나 보인다.

이번 작업은 해당 화면만 미세 조정하는 것이 아니라, **BaseKit Grid 안의 상태/유형 표현과 Grid 상단 보조 컨트롤 배치 시 지켜야 할 DESIGN 기준을 정리**하는 작업이다.

프로토타입용 임의 CSS가 아니라 실제 BaseKit 공통 Grid/공통 CSS 규격을 우선한다.

## 2. 현재 문제

### 2-1. 상태/유형 Badge

프로그램관리 Grid의 상태와 유형 컬럼에서 다음 문제가 보인다.

- Badge 배경과 둥근 모서리가 강해 셀 바깥에 떠 있는 것처럼 보임
- Grid row 높이 대비 Badge 높이/세로 여백이 과함
- 셀의 기본 정렬선과 Badge 내부 텍스트 정렬선이 어긋나 보임
- 상태와 유형이 동일한 시각 강도로 표현되어 정보 역할 구분이 약함
- BaseKit의 compact grid density와 표현 밀도가 맞지 않음

### 2-2. Endpoint 목록 상단 `표시 / 선택 Program 연결 / 추가 권한`

현재 Endpoint 목록 위에 Select/Combo가 독립적인 입력 폼처럼 배치되어 다음 문제가 보인다.

- 좌측 `PROGRAM_MGMT 버튼 권한 그룹` 영역의 Title/Toolbar 시작선과 우측 Endpoint 영역의 상단 컨트롤 시작선이 맞지 않음
- 우측 Grid Title(`USER_MGMT Endpoint 목록`, 총건수, UNMAPPED 건수)과 Select/Combo가 동일한 정보 계층으로 보이지 않음
- Select/Combo의 기본 브라우저 스타일과 높이가 BaseKit Toolbar/ActionButton/Grid header density와 다름
- `표시`, `선택 Program 연결`, `추가 권한`이 한 줄에 별도로 떠 있어 Grid 밖의 임시 설정 영역처럼 보임
- 좌우 Master/Detail 영역에서 상단 높이가 달라져 Grid 본문 시작 위치가 어긋남
- Select 폭과 label 간격이 임의적으로 보여 화면 전체 compact density를 깨뜨림

## 3. DESIGN 기준

### 3-1. Grid Cell 내부 표현 원칙

Badge/Pill은 반드시 Grid Cell renderer 또는 동일한 셀 렌더링 영역 안에서 표현한다.

- 셀의 기본 padding/정렬 규칙을 유지한다.
- 임의 margin, absolute positioning, row 밖으로 보이는 보정은 사용하지 않는다.
- 텍스트 baseline과 셀 vertical alignment가 자연스럽게 맞아야 한다.
- Badge 자체가 셀보다 시각적으로 더 강하게 떠 보이지 않아야 한다.

### 3-2. 크기와 밀도

BaseKit의 compact Grid 밀도를 우선한다.

DESIGN 권고:

- Badge 높이: 약 20~22px 범위 검토
- 좌우 padding: 최소한으로 사용
- 상하 padding: row 높이를 침범하지 않을 정도로 최소화
- border-radius: 기본은 4~6px 수준의 compact badge
- pill 형태가 필요한 경우에도 과도한 타원형/높은 둥근값을 피한다.
- 텍스트 길이에 맞는 최소 폭만 사용하고 고정 폭을 두지 않는다.

정확한 px 수치는 현재 공통 Grid row/header metric과 CSS token을 먼저 확인한 뒤 확정한다. DESIGN이 BaseKit 표준과 무관한 새 metric을 임의로 만들지 않는다.

### 3-3. 상태(Status)와 유형(Type) 역할 분리

`상태`와 `유형`은 동일한 의미가 아니므로 동일한 시각 강도를 사용하지 않는다.

권장 방향:

- `상태` — 의미 상태를 전달하는 compact semantic badge
  - 예: AVAILABLE / NEW
  - 상태 차이가 식별될 정도의 약한 semantic tone 사용
- `유형` — 분류값을 전달하는 neutral compact label
  - 예: 목록 / 목록·상세 / 홈
  - 상태 Badge보다 색상·배경 대비를 낮춘다.

색상은 기존 BaseKit semantic token 또는 현재 사용 중인 공통 token을 우선한다. 신규 색상 팔레트를 DESIGN에서 임의 추가하지 않는다.

### 3-4. Endpoint 상단 보조 컨트롤 배치 원칙

`표시`, `선택 Program 연결`, `추가 권한`은 별도 검색 Form이나 독립 Filter Panel처럼 보이게 두지 않는다.

해당 컨트롤은 **Endpoint Grid의 보조 Toolbar/Option 영역**으로 취급하고 다음 원칙을 적용한다.

- Endpoint Grid의 Title/총건수/UNMAPPED 정보 및 우측 ActionButton 영역과 하나의 Toolbar 계층 안에서 정렬한다.
- 좌측 권한 그룹 Grid와 우측 Endpoint Grid의 상단 높이와 본문 시작선이 가능한 한 동일하게 맞아야 한다.
- 기존 BaseKit Toolbar의 높이, padding, gap, border, 배경 규칙을 우선한다.
- Select/Combo는 native browser select 모양 그대로 두지 말고 기존 BaseKit Form control/select 규격이 있으면 반드시 재사용한다.
- label과 control 높이는 Toolbar 안에서 vertical-center가 맞아야 한다.
- `표시`, `추가 권한`처럼 짧은 옵션은 불필요하게 큰 Select 폭을 사용하지 않는다.
- `선택 Program 연결`은 의미가 길더라도 Grid 폭을 침범하거나 좌측 영역과 수평선이 어긋나지 않도록 제한 폭/ellipsis 또는 적절한 compact control을 검토한다.
- Toolbar가 두 줄로 깨지거나 Grid 본문을 밀어내는 구조는 기본안으로 사용하지 않는다. 불가피한 경우 반응형 규칙을 명시한다.
- 옵션 영역과 Action 영역(`새로고침`, `Program 연결`, `연결해제`)은 좌/우 그룹으로 명확히 구분한다.
- 조회 결과가 없더라도 Toolbar/Title/Grid header의 위치가 변하지 않아야 한다.

권장 화면 구조 예시:

`[Endpoint 목록 + 총건수 + UNMAPPED]  [표시 ▼] [선택 Program 연결 ▼] [추가 권한 ▼]   |   [새로고침] [Program 연결] [연결해제]`

단, 실제 배치 순서와 간격은 기존 BaseKit Toolbar 컴포넌트/패턴을 먼저 확인한 뒤 결정한다. 새 전용 Toolbar 디자인을 임의로 만들지 않는다.

### 3-5. 좌우 Grid 정렬 원칙

현재 화면은 좌측 `버튼 권한 그룹`과 우측 `Endpoint 목록`이 같은 Detail 영역을 구성하므로 다음 정렬을 검수한다.

- 좌/우 Section Title baseline
- 총건수 baseline
- Toolbar 높이
- Grid header 시작 Y 위치
- Grid 본문 시작 Y 위치
- 하단 scrollbar 위치

기능 차이 때문에 컨트롤 수가 달라도 **Grid 본문 시작선이 눈에 띄게 어긋나지 않는 것**을 우선한다.

### 3-6. BaseKit 화면 표준 유지

이번 보완으로 기존 Grid 규격을 흔들지 않는다.

반드시 유지:

- 기존 Grid row/header 높이
- 컬럼 정렬 및 header 정렬
- hover/selected/focus 상태
- 총건수 표현
- Title/Section Title 표현
- Grid scroll 및 fixed/flex column 동작
- Tooltip / ellipsis 정책
- 공통 CSS spacing / density
- 기존 Toolbar / ActionButton / Select/Form control 규격

## 4. DESIGN 산출물

DESIGN 팀은 다음을 확인하고 기준을 문서화한다.

1. 현재 상태/유형 renderer 및 관련 CSS가 공통인지 화면 전용인지 확인
2. 상태 Badge / 유형 Label 각각의 권장 시각 규격 정리
3. 실제 BaseKit Grid row 안에서의 정렬 기준 확인
4. Endpoint 상단 `표시 / 선택 Program 연결 / 추가 권한` 영역이 어떤 기존 Toolbar/Form control 패턴을 재사용해야 하는지 확인
5. 좌측 권한 그룹 Grid와 우측 Endpoint Grid의 상단/본문 시작선 정렬 기준 제시
6. 최소 1개 프로그램관리 화면 기준 Before / After 비교안 작성
7. 공통 적용 가능한 경우 COMMON 전달 여부 판정
8. 화면 전용 구현이면 해당 화면 구현팀 전달 여부 판정

새 UI 라이브러리나 별도 디자인 시스템은 만들지 않는다.

## 5. 구현 주체 판정

DESIGN은 우선 기준만 확정한다.

확정 후:

- 공통 Cell renderer / 공통 CSS / 공통 Badge / 공통 Select/Toolbar 변경이 필요하면 → `COMMON`
- 프로그램관리 화면 전용 renderer/CSS/Toolbar 조합이면 → 해당 화면 구현팀
- 양쪽에 걸치면 공통 표현 규격은 COMMON, 화면별 데이터 매핑/배치는 화면 구현팀

DESIGN 팀이 공통 코드를 임의 수정하지 않는다.

## 6. 검수 기준

다음 조건을 만족해야 DESIGN 승인 가능하다.

- 상태/유형 값이 Grid Cell 내부 데이터로 자연스럽게 보인다.
- Badge가 Row 높이 밖으로 떠 보이지 않는다.
- 셀의 vertical alignment가 맞는다.
- 상태와 유형의 역할 차이가 시각적으로 구분된다.
- Endpoint 상단 Select/Combo가 임시 Form처럼 떠 보이지 않고 Grid Toolbar 일부로 읽힌다.
- 좌측 권한 그룹 Grid와 우측 Endpoint Grid의 Title/Toolbar/Grid header 시작선이 시각적으로 안정적이다.
- Select/Combo 높이/폰트/border/padding이 BaseKit control density와 일치한다.
- ActionButton과 옵션 Select가 같은 Toolbar 안에서 역할별로 구분된다.
- BaseKit compact density를 해치지 않는다.
- 총건수, Title, Grid metric 등 기존 표준은 그대로 유지된다.
- 선택/hover/focus 상태에서도 Badge와 control이 깨지지 않는다.
- 긴 유형값, 영문 상태값, 긴 Program 연결 옵션에서도 overflow/ellipsis가 안정적이다.
- 별도 하드코딩 색상/metric보다 기존 token과 공통 컴포넌트를 우선한다.

## 7. 완료 후 회신

상세 내용을 채팅에 복붙하지 않고 아래만 회신한다.

- 완료 commit SHA
- 수정/추가 문서 목록
- 권장안 요약: 상태 Badge / 유형 Label / Endpoint Toolbar
- 공통 변경 필요 여부: COMMON / 화면 구현팀 / 없음
- 보류 사항

DESIGN 검토는 회신된 SHA 기준으로 진행한다.
