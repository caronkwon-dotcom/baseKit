# 010. Program Data Grid and Permission Actions

## 상태

Accepted

## 배경

목록 화면마다 그리드 제목, 요약 카운트, 총 건수, 등록·삭제·엑셀 다운로드 버튼을 반복 구현하면 화면별 배치와 권한 처리가 달라진다. 개발자는 버튼 JSX가 아니라 업무 실행 로직에 집중할 필요가 있다.

## 결정

- 목록 표준 영역은 `ProgramDataGrid` 공통 컴포넌트가 생성한다.
- 제목을 지정하지 않으면 `메뉴명 + 목록`을 사용한다.
- 중요 카운트는 제목 오른쪽, `총 N건`은 그리드 바로 위 오른쪽에 표시한다.
- 공통 Grid Action은 `CREATE`, `DELETE`, `EXCEL_DOWNLOAD`을 우선 지원한다.
- Program이 지원하고 `ROLE × PROGRAM × ACTION_CODE`가 허용한 Action만 공통 영역에 자동 표시한다.
- 버튼명은 `meta/actions.json`을 사용하며 Page는 `ACTION_CODE`별 실행 함수만 `actionHandlers`로 연결한다.
- 엑셀 다운로드는 텍스트 없는 작은 아이콘 버튼으로 표시하고 접근성 명칭을 제공한다.
- 행 단위 Action을 위해 공통 Grid는 선택 체크박스를 지원한다.

## 현재 구현 범위

- Frontend Mock 메타데이터와 `hasAction()` 기반 노출
- Action 함수에 전체 행과 선택 행 제공
- 제목, 요약 카운트, 총 건수, 그리드의 통합 배치

## 후속 범위

로그인 사용자 역할 주입, Backend 권한 재검증, 동적 Action 배치와 오류·로딩 처리는 별도 설계로 진행한다.
