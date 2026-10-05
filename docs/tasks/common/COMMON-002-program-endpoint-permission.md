# COMMON-002 Program / Endpoint / Button Permission 구현 작업지시

## 1. 목적
DESIGN팀이 작성한 Program 관리 UX 초안을 기준으로 BaseKit 공통 개발표준을 적용한 실제 Program 관리 화면을 구현하고, Backend Endpoint 자동수집 기능을 함께 구현한다.

본 작업은 SD 요구사항 분석 흐름과 무관한 **COMMON 공통 시스템 관리 영역**이다.

공통 시스템 흐름은 아래를 기준으로 한다.

`PROGRAM → ENDPOINT → MENU → 권한`

현재 Program 관리 1단계는 완료된 상태이며, 이번 범위는 **Program 하위의 버튼 권한 그룹 / Endpoint 관리와 Endpoint 자동수집**까지다.

---

## 2. 권한 원칙

### 2.1 Program 권한
사용자에게 해당 Program 권한이 있으면 그 Program에 연결된 일반 Endpoint는 기본적으로 실행 가능하다.

Endpoint마다 별도의 권한을 의무적으로 생성하지 않는다.

### 2.2 버튼 권한 그룹
특정 기능만 추가 제한할 경우 **버튼 권한 그룹**을 사용한다.

개별 버튼마다 권한을 생성하지 않고 그룹 단위로 관리한다.

- COMMON 권한 그룹
- CUSTOM 권한 그룹

예시:
- `COMMON.DELETE`
- `COMMON.EXPORT`
- `CUSTOM.APPROVE`
- `CUSTOM.CONFIRM`

Endpoint에 추가 권한 그룹이 없으면 Program 권한만 검사한다.

Endpoint에 추가 권한 그룹이 있으면 다음을 모두 검사한다.

- Program 권한
- Button Permission Group 권한

Frontend의 버튼 표시/활성 제어는 UX 목적이며, 실제 권한 통제는 Backend에서 수행하는 방향을 유지한다.

---

## 3. Program 관리 화면 구조

기존 Program 관리 화면을 Master로 유지하고 하단 Detail 영역을 확장한다.

```text
┌──────────────────────────────────────────────┐
│                Program 목록                  │
│                  TOP 60%                     │
├──────────────────────┬───────────────────────┤
│ 버튼 권한 그룹       │ Endpoint 목록         │
│ BOTTOM LEFT 40%      │ BOTTOM RIGHT 60%      │
└──────────────────────┴───────────────────────┘
           BOTTOM 전체 기본 40%
```

### Splitter
- TOP : BOTTOM 기본 비율 = `60 : 40`
- BOTTOM LEFT : RIGHT 기본 비율 = `40 : 60`
- 상하 / 좌우 모두 Drag 조절 가능
- 기존 BaseKit Layout/Splitter 표준이 있으면 우선 재사용
- 최소 크기는 기존 공통 레이아웃 기준을 확인하여 적용하고 임의 수치 확정은 지양

Program 선택 시 하단 두 영역을 동시에 갱신한다.

```text
Program 선택
 ├─ 버튼 권한 그룹
 └─ Endpoint 목록
```

---

## 4. Frontend 개발표준 적용

DESIGN Wireframe의 CSS를 그대로 제품 코드에 복사하지 않는다.

현재 BaseKit 제품 코드에서 실제 사용하는 공통 화면/그리드 표준을 먼저 조사하고 동일 규칙을 적용한다.

반드시 확인 및 적용할 항목:

- 공통 CSS
- PageHeader
- SearchPanel
- 기존 공통 Grid 컴포넌트
- Grid density
- Grid padding / gap
- Grid Header / Body 규칙
- 전체 건수 표시 위치
- Action 버튼 위치 및 순서
- Empty 상태
- Loading 상태
- Error 상태
- Master/Detail 관련 기존 공통 Layout
- 컬럼 폭/정렬/말줄임 등 기존 Grid 표준

신규 CSS / 신규 컴포넌트 생성보다 기존 공통 클래스와 컴포넌트 재사용을 우선한다.

### BOTTOM LEFT — 버튼 권한 그룹
선택 Program에서 사용하는 버튼 권한 그룹을 관리한다.

예상 항목:
- 구분 (`COMMON` / `CUSTOM`)
- 권한 그룹 코드
- 권한 그룹명
- 설명
- 사용 여부

이 화면은 개별 화면 버튼 목록을 관리하는 영역이 아니다.

**Program이 어떤 버튼 권한 그룹을 사용하는가**를 관리하는 범위로 구현한다.

### BOTTOM RIGHT — Endpoint
선택 Program과 연결된 자동수집 Endpoint를 표시한다.

최소 표시 항목:
- HTTP Method
- Endpoint Path
- Controller Class
- Handler Method
- 수집 상태
- Program Mapping 상태
- 추가 버튼 권한 그룹

Endpoint는 수동 등록/직접 수정 데이터처럼 보이지 않게 한다.

HTTP Method / Path / Controller / Handler Method는 자동수집 정보이므로 일반 관리자의 직접 수정 대상으로 두지 않는다.

---

## 5. Backend Endpoint 자동수집

Endpoint는 수동 등록 방식이 아니라 **Backend 자동수집**을 기본 원칙으로 한다.

Spring MVC 런타임의 실제 Request Mapping 정보를 활용하는 방식을 우선 검토한다.

예:
- `RequestMappingHandlerMapping`
- Controller Mapping Metadata

최소 수집정보:

- HTTP Method
- Path
- Controller Class
- Handler Method

현재 소스에 기존 Endpoint Registry / Entity / Repository / API가 존재하면 신규 모델을 만들기 전에 반드시 재사용 가능성을 먼저 검토한다.

---

## 6. Program ↔ Endpoint Mapping

현재 Program / Endpoint 관련 소스와 DB 모델을 먼저 조사한다.

기존 관계가 있으면 우선 재사용한다.

기존 관계가 없다면 이번 작업 목적을 만족하는 최소 변경으로 구현한다. 대규모 권한 모델 재설계는 하지 않는다.

Endpoint 한 개가 여러 Program에서 사용될 가능성이 있으므로 관계 Cardinality는 기존 구조와 실제 사용 사례를 확인하여 결정한다.

향후 아래 형태의 자동 매핑 후보 생성이 가능하도록 확장 여지는 둔다.

`Program Entry Page → imported Component / Popup / Hook / Service → API Client → Endpoint`

단, 이번 TASK에서 Frontend Dependency Graph 자동 분석까지 과도하게 확장하지 않는다.

---

## 7. UNMAPPED 정책

자동수집되었으나 Program과 연결되지 않은 Endpoint는 `UNMAPPED` 상태로 식별한다.

이번 단계에서 `UNMAPPED` Endpoint를 Runtime 차단하지 않는다.

즉:

- 관리 화면에서 강하게 식별
- 정리 대상 표시
- 실행은 기존 동작 유지

향후 안정화 후 CI 검증 / Runtime Default Deny 강화 여부를 별도 결정한다.

---

## 8. 화면 상태

### Program 미선택
하단 두 영역에 안내 상태를 제공한다.

예: `프로그램을 선택하세요.`

### Program 선택
버튼 권한 그룹과 Endpoint를 함께 조회한다.

### Endpoint UNMAPPED
상태를 명확하게 식별할 수 있어야 한다.

### Empty / Loading / Error
기존 BaseKit 공통 화면표준을 조사하여 동일 방식으로 적용한다.

---

## 9. 작업 순서

1. 현재 branch / worktree / `git status` 확인
2. 기존 사용자 변경사항 보존
3. 기존 Program 관리 화면 소스 확인
4. BaseKit 표준 화면/Grid/CSS 실제 구현 조사
5. Backend의 Endpoint / Program 관련 Entity, Repository, Service, API 조사
6. 본 TASK를 실행 기준으로 재확인
7. Frontend Program 관리 표준화 구현
8. Backend Endpoint 자동수집 구현
9. Program 선택 → Endpoint / 버튼권한 그룹 조회 연결
10. lint / frontend build / backend test
11. 가능하면 실제 브라우저 화면 검증
12. RESULT 문서 작성 및 commit/push

---

## 10. 제외 범위

이번 TASK에서는 아래를 진행하지 않는다.

- Menu 관리 화면
- Role 전체 권한관리 화면
- SD 요구사항 분석
- Endpoint 미매핑 Runtime 차단
- Frontend Dependency Graph 기반 Endpoint 자동매핑 완성
- 대규모 인증/권한 아키텍처 재설계

---

## 11. 완료 보고

완료 시 다음을 RESULT에 기록한다.

- 변경 파일
- 적용한 기존 공통 컴포넌트 / CSS / Grid 표준
- Endpoint 자동수집 구현 방식
- Program ↔ Endpoint 저장/조회 구조
- 버튼 권한 그룹 적용 방식
- lint / build / backend test 결과
- 브라우저 검증 결과
- 미결사항 / 후속 설계 항목
- commit SHA

## 12. 완료 기준

아래가 충족되면 본 TASK 구현 완료로 판단한다.

1. 기존 Program 관리 화면이 BaseKit 표준 UI를 유지한 상태로 TOP/BOTTOM 구조로 확장됨
2. Program 선택에 따라 버튼 권한 그룹 / Endpoint 목록이 조회됨
3. Endpoint가 Backend에서 자동수집됨
4. Program 미매핑 Endpoint를 `UNMAPPED`로 식별 가능함
5. 일반 Endpoint는 Program 권한을 기본으로 하고 특정 Endpoint만 버튼 권한 그룹 추가 제한이 가능한 구조가 마련됨
6. Frontend / Backend 기본 검증을 통과하고 결과가 문서화됨
