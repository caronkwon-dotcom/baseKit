# DESIGN 팀 작업지시

작성일: 2026-10-05
기준 브랜치: `design-work`
기준 승인 SHA: `99bd96dfd2441184344045ed63186fdde6eeac3d`
대상 경로: `docs/design/sd-requirement-analysis/`

## 목적

SD 요구사항 분석·프로그램 생성 UX 2차 설계를 DESIGN 기준으로 승인하고, 이후 DESIGN 팀의 역할을 `추가 설계`가 아니라 `SD 구현 완료 후 실제 제품 UX 검수`로 전환한다.

현재 승인된 기준은 다음과 같다.

- 제품 기준 4단계 흐름: 요구사항 준비 → 분석 → 결과 검토 → 확정·생성
- 분석 중/실패/완료는 분석 단계 내부 상태
- 입력 변경 시 기존 결과는 STALE로 보존
- STALE 상태에서는 후보 선택·편집·확정·생성 차단
- 재분석 후 다시 검토·확정
- 결과 5개 탭: 요약 / 업무메뉴·역할·액션 / 프로세스 / Layout 추천 / SD 프로그램 후보
- LLM 원본과 사용자 편집본 구분
- 수정 시 기존 확정 해제
- 기본 생성 후보 선택 0건
- 사용자 확정 후에만 생성 가능
- 성공 건 재생성 금지, 일부 실패는 실패 건만 재시도
- 응답 유실/불명 상태에서는 상태 조회 우선

## BaseKit 화면 표준 우선 원칙

현재 `SD-UX-wireframes.html`은 UX 흐름과 상태 전이를 검토하기 위한 프로토타입이다. 프로토타입에서 실제 BaseKit Grid 및 공통 CSS를 완전히 적용하지 못한 부분은 제품 UI 규격으로 간주하지 않는다.

실제 SD 구현과 DESIGN 검수에서는 **BaseKit의 기존 화면 규격과 공통 CSS/컴포넌트를 최우선 기준**으로 사용한다.

반드시 유지할 기준:

- BaseKit 공통 CSS 및 화면 density/padding/spacing 기준 우선
- 기존 `PageHeader`, `BaseKitDataGrid`/공통 Grid, `BaseTabs`, `ActionButton`, `BaseKitMessage`, `FormModal`, `ProjectListDetailWorkspace` 등 공통 컴포넌트 우선 사용
- 기존 표준 화면의 Title/Section Title 계층과 위치 유지
- 목록/그리드 영역의 **총건수 표시 규칙 유지**
- 검색영역, Toolbar, Grid, 상세 영역의 기존 정렬·간격·높이 규칙 유지
- Grid Header/Row 높이, 내부 Scroll, 컬럼 정렬·말줄임·Tooltip 등 BaseKit Grid 규격 유지
- 버튼 위치·크기·표시 방식은 기존 공통 Action 규격 유지
- 화면별 임의 CSS 추가보다 공통 token/class/component 재사용을 우선
- 프로토타입의 시각 표현과 BaseKit 표준이 충돌하면 **BaseKit 표준을 우선**하고 UX 의도만 유지

특히 프로토타입에서 보이는 단순 HTML table, 임시 card/pill, spacing 값은 구현 규격이 아니다. 실제 제품에서는 기존 BaseKit Grid·CSS·타이틀·총건수 표현을 기준으로 치환한다.

DESIGN 검수 시 기능 흐름만 확인하지 않고 아래도 함께 확인한다.

1. 페이지 Title과 상단 Action 위치가 기존 BaseKit 표준과 일치하는가
2. 목록/그리드 Title 옆 또는 표준 위치의 총건수 표현이 유지되는가
3. 검색/목록/상세/탭 간 padding·gap·height가 공통 규격과 일치하는가
4. 신규 화면만 별도 CSS 체계로 보이지 않는가
5. 공통 Grid로 표현 가능한 영역을 임의 table/div로 새로 구현하지 않았는가
6. 기존 공통 컴포넌트로 가능한 UI를 신규 로컬 컴포넌트로 중복 구현하지 않았는가

## DESIGN 팀 현재 작업

### 1. 승인 기준 고정

`99bd96dfd2441184344045ed63186fdde6eeac3d`를 SD 구현 전 DESIGN 기준선으로 사용한다.

이 SHA 이후 DESIGN에서 임의로 화면 구조, 상태 계약, 생성 흐름을 변경하지 않는다. 변경 필요 시 SD 구현 영향도를 확인한 뒤 별도 변경 요청으로 관리한다.

### 2. SD 구현 대기

실제 제품 UX 검수는 SD 구현 완료 SHA를 전달받은 뒤 시작한다.

SD에서 다음 정보를 전달받아야 한다.

- 구현 branch / commit SHA
- 실행 방법 또는 검수 URL
- 승인된 테스트 프로젝트
- 정상/오류 Excel 샘플
- 회사 LLM 연결 가능 여부
- 분석/조회/확정/생성/재조회 API 구현 상태
- build/lint/test 결과
- 미구현 또는 Mock 처리 범위

### 3. 구현 후 DESIGN 검수

`UX-review.md`를 기준으로 실제 제품을 검수한다.

우선 확인 항목:

1. 4단계 흐름과 분석 내부 상태가 실제 화면에 동일하게 반영되는가
2. 요구사항 선택/원문 버전/개별 의견/종합 의견 변경 시 STALE가 정확히 발생하는가
3. STALE 상태에서 후보 선택·편집·확정·생성이 실제로 차단되는가
4. 재분석 후 이전 결과와 새 결과가 혼동되지 않는가
5. 5개 결과 탭과 출처 요구사항이 실제 데이터 기준으로 표시되는가
6. 원본/편집본 구분과 수정 시 확정 해제가 동작하는가
7. 기본 후보 선택 0건, 사용자 명시 선택 후 확정이 지켜지는가
8. 생성 성공 건 중복 생성 방지, 일부 실패 건 재시도, 응답 유실 시 상태 조회가 동작하는가
9. 시스템 관리 Program/Runtime/권한과 SD 설계 프로그램 생성이 분리되어 있는가
10. 키보드, 모달 focus, splitter, 320px, 긴 결과에서도 주요 행동이 가능하고 읽을 수 있는가
11. BaseKit 공통 CSS, Grid, Title, 총건수, spacing/padding 규격이 기존 표준 화면과 일치하는가
12. 프로토타입 임시 표현이 제품 코드에 그대로 복제되지 않고 공통 컴포넌트로 치환되었는가

### 4. 판정 원칙

프로토타입 통과를 실제 제품 통과로 간주하지 않는다.

다음 중 하나라도 남아 있으면 DESIGN 최종 승인하지 않는다.

- 실제 회사 LLM 호출 미검증
- 데이터 유실 가능성
- 다른 프로젝트 데이터 반영 가능성
- STALE 상태에서 확정/생성 우회 가능
- 중복 생성 가능
- 생성 후 재조회 불일치
- 성공/실패 상태 복구 불가
- BaseKit 표준 Grid/CSS/Title/총건수 규격을 무시한 별도 화면 구현

접근성·반응형 결함은 심각도와 수정 여부를 기록하고 동일 시나리오로 재검수한다.

## 현재 산출물

- `SD-UX-wireframes.html`
- `SD-UX-handoff.md`
- `COMMON-UX-requests.md`
- `UX-review.md`

현재 COMMON 신규 요청은 없다. COMMON 관련 추가 결함이 실제 SD 구현 검수에서 확인될 경우에만 별도 요청한다.

## 완료 조건

이 작업지시는 즉시 구현 작업을 요구하는 문서가 아니다.

DESIGN 팀의 현재 완료 상태는 `SD 구현 검수 대기`이며, SD 구현 완료 SHA를 전달받으면 본 문서와 `UX-review.md` 기준으로 실제 제품 UX 검수를 재개한다.

## DESIGN 팀 회신 형식

현재 단계에서는 아래처럼 짧게 회신한다.

- 기준 SHA 확인
- 상태: SD 구현 검수 대기
- 추가 DESIGN 변경 없음
- BaseKit 화면 표준 우선 원칙 확인
- SD 구현 완료 SHA 수신 후 UX-review 기준 검수 예정

SD 구현 후 검수가 끝나면 다음만 회신한다.

- 검수 대상 SD SHA
- PASS / 수정 필요
- 실패한 UX-review ID
- BaseKit 화면 표준 위반 여부
- 필수 수정 사항
- 재검수 필요 여부
