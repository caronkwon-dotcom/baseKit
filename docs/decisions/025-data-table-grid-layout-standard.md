# ADR 025: DataTable과 Grid Layout 표준

## 상태

Accepted

## 배경

조회 건수와 컬럼 문자열 길이에 따라 Grid 높이와 폭이 바뀌면 업무 화면의 배치가 흔들리고 Master/Detail 화면에서 불필요한 가로 Scroll이 발생한다. PROGRAM, MENU 등 후속 관리화면도 같은 기준을 사용할 수 있도록 화면별 임시 CSS가 아닌 공통 DataTable 계약이 필요하다.

## 결정

- 공통 DataTable 최소 높이는 `288px`, 최대 높이는 `416px`로 한다.
- Header 높이는 `34px`, Row 높이는 `32px`로 한다.
- 데이터가 적어도 최소 높이를 유지하고, 최대 높이를 넘으면 Grid 내부에서 세로 Scroll한다.
- Header는 Grid 내부 세로 Scroll 시 상단에 고정한다.
- Table은 `table-layout: fixed`를 사용하고 전체 가용 폭 안에서 배치한다.
- 컬럼은 `width`(고정 px), `minWidth`(가변 최소 px), `flex`(남은 폭 배분 비율)를 선언할 수 있다.
- 별도 지정이 없는 컬럼은 `flex: 1`로 처리한다.
- 셀은 기본 한 줄 말줄임으로 표시하고 전체 값은 Tooltip으로 확인한다. 전체 표시가 필요한 컬럼만 `truncate: false`를 선언한다.
- 숫자는 우측, 상태·선택값은 중앙 정렬할 수 있도록 `align`을 제공한다.
- Master/Detail의 기본 비율은 `40:60`이며 두 영역 모두 `min-width: 0`으로 부모 폭 안에서 수축한다.
- 공통코드의 일시는 초 단위와 Timezone 문자열을 Grid에서 생략하고 `YYYY-MM-DD HH:mm`으로 표시한다.

## 영향범위

- `DataTable`을 사용하는 기존 화면은 데이터 건수와 무관한 기본 Grid 높이와 내부 Scroll을 적용받는다.
- 가로 Scroll이 업무상 필요한 대량 컬럼 샘플은 기존 `scrollSample`처럼 명시적으로 확장 폭을 유지한다.
- PROGRAM/MENU 등 후속 관리화면은 같은 컬럼 폭 API와 Master/Detail 비율을 재사용한다.
