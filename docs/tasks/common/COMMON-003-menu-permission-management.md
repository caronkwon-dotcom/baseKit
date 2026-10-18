# COMMON-003 메뉴관리 / 권한관리 구현 작업지시

## 1. 목적

Program 관리 1단계와 Endpoint 자동수집/버튼권한그룹 구현 이후, BaseKit 공통 시스템 관리의 다음 단계인 **메뉴관리와 권한관리**를 연결한다.

이번 작업은 SD 요구사항 흐름과 무관한 **COMMON 시스템 관리 기능**이다.

구현 순서는 반드시 아래 순서를 따른다.

1. 현재 MENU_MGMT / 권한 관련 Source, DB, API, UI 현황 조사
2. 메뉴관리 구조 확정 및 구현
3. 메뉴와 Program 연결
4. 역할(Role) / Program 권한 / 버튼권한그룹 권한 구조 확인
5. 권한관리 화면 및 서버 연결
6. 실제 메뉴 노출 및 서버 권한검사와의 연결 가능 범위 검증

임의로 전체 인증 아키텍처를 재설계하지 않는다.

---

## 2. 현재 확정된 COMMON 기준

### Program
- Program은 공통 시스템의 기능 단위이다.
- Program 관리 1단계는 완료되어 있다.
- Program Registry는 기존 구조를 재사용한다.

### Endpoint
- Backend Endpoint는 Spring Runtime Mapping에서 자동수집한다.
- Program ↔ Endpoint는 다대다 연결 가능하다.
- Program 권한이 있으면 일반 Endpoint는 기본 실행 가능하다.
- 특정 기능에 대해서만 버튼권한그룹을 추가로 요구한다.
- UNMAPPED Endpoint는 관리상 상태이며 현재 Runtime 차단 대상은 아니다.

### 버튼 권한
- 버튼 하나마다 별도 권한을 생성하지 않는다.
- **버튼권한그룹** 단위로 관리한다.
- 그룹 구분은 COMMON / CUSTOM을 유지한다.
- Endpoint에 추가 버튼권한그룹이 없으면 Program 권한만 적용한다.
- 추가 그룹이 있으면 Program 권한 + 해당 버튼권한그룹 권한을 적용한다.

---

# 3. 메뉴관리 설계 원칙

## 3.1 Menu와 Program의 관계

Menu는 권한의 본체가 아니라 **Program으로 진입하기 위한 Navigation 구조**로 본다.

기본 관계:

```
Menu
  ↓
Program
  ↓
Route / Runtime
```

권한 기준:

```
User / Role
   ↓
Program Permission
   ↓
Menu 노출 가능 여부
```

Menu 자체에 독립적인 실행 권한을 중복 생성하지 않는다.

---

## 3.2 메뉴 유형

최소 아래 유형을 지원하는 기존 구조를 우선 확인한다.

### GROUP / FOLDER
- 하위 메뉴 묶음
- Program 연결 없음
- Route 없음

### PROGRAM / SINGLE
- 실제 실행 메뉴
- Program 연결 필요
- Program의 Route/Runtime을 사용

기존 코드에 이미 정의된 유형명이 있으면 신규 명칭을 만들지 말고 기존 명칭을 우선 사용한다.

---

## 3.3 메뉴 기본 속성

현행 DB/API를 먼저 조사하고 아래 항목과 대조한다.

- MENU_ID / MENU_KEY
- 메뉴명
- Parent Menu
- Depth
- 순서
- 메뉴 유형
- Program 연결
- 아이콘
- 사용 여부
- 설명

Depth는 현재 BaseKit 정책인 최대 3Depth 기준을 우선 확인한다.

Program 하나가 여러 Menu에서 참조되는 것을 허용할 수 있는 구조로 본다.

---

# 4. 메뉴관리 화면

기존 BaseKit 개발 표준을 반드시 적용한다.

확인 대상:
- PageHeader
- SearchPanel
- BaseKitDataGrid / ProgramDataGrid
- Grid Header / Row density
- 총 건수 위치
- Action Toolbar
- 공통 Message Area
- Empty / Loading / Error
- 공통 Modal
- Splitter / Master-Detail 표준

DESIGN 전용 CSS를 복사하지 않는다.

## 권장 기본 UX

좌측 또는 상단:
- Menu Tree 또는 Menu List
- Depth / Parent 관계 확인 가능

우측 또는 하단:
- 선택 메뉴 상세
- 연결 Program
- Program Key / Program명 / Route 정보 확인

기존 MENU_MGMT 화면이 이미 있으면 전체 재설계하지 말고 **현행 화면을 우선 분석한 후 최소 변경**한다.

---

# 5. 메뉴와 Program 연결 정책

실행형 메뉴는 Program을 연결한다.

연결 시 표시 가능한 정보:
- Program Key
- Program명
- Module
- Program 유형
- Runtime / Route
- 사용 여부

Program이 비활성 상태이면 메뉴를 정상 실행 가능한 상태로 보지 않는다.

Menu에서 Route 문자열을 별도로 중복 관리하는 구조가 있다면 현재 Runtime 설계와 비교하여 중복 여부를 보고한다.

임의 제거 금지.

---

# 6. 권한관리

## 6.1 기본 모델

현재 기준 모델:

```
USER
  ↓
ROLE
  ↓
PROGRAM_PERMISSION
  ↓
BUTTON_PERMISSION_GROUP
```

실제 기존 DB/Entity/API가 이 구조와 다른 경우 반드시 현행을 먼저 보고하고 기존 자산을 최대한 재사용한다.

---

## 6.2 Program 권한

Role이 Program 접근 권한을 가진다.

Program 권한이 있으면:
- 해당 Program 메뉴 노출 가능
- 해당 Program의 일반 Endpoint 실행 가능

Program 권한이 없으면:
- Menu 비노출 원칙
- URL 직접 접근 및 API 호출은 Backend에서 차단 가능한 구조 유지

현재 Host 인증 Provider가 완성되지 않았다면 임의 인증 구현을 하지 말고, 기존 Provider 계약과 연결 가능한 구조까지 구현한다.

---

## 6.3 버튼권한그룹

Role별로 Program 안에서 필요한 버튼권한그룹을 추가 부여한다.

예:

```
ROLE_A
 └─ PROGRAM_MGMT
      ├─ Program 접근 허용
      └─ CUSTOM.SYNC 허용
```

버튼권한그룹은 Program별 그룹을 재사용한다.

Frontend:
- 권한 없는 기능 버튼 Hide / Disable 정책은 기존 표준 확인 후 적용

Backend:
- 실제 보안은 EndpointPermissionPolicy / Provider 구조를 기준으로 적용 가능하게 한다.

Frontend 표시만으로 보안을 처리하지 않는다.

---

# 7. 권한관리 화면

현행 권한/역할 화면이 있으면 반드시 먼저 조사한다.

신규 UI를 만들기 전에 아래를 확인한다.

- Role 관리 존재 여부
- 사용자 ↔ Role 관계
- Role ↔ Program 권한
- Role ↔ 버튼권한그룹 관계
- 기존 Seed / DB Table
- Backend Endpoint
- Frontend 화면

### 권장 화면 구조

Master:
- Role 목록

Detail:
- Program 권한
- 선택 Program의 버튼권한그룹

예:

```
ROLE 목록
   ↓
Program 권한 목록
   ↓
선택 Program의 버튼권한그룹
```

다만 기존 권한관리 UX가 있으면 현행을 우선 사용하고 전체 재설계하지 않는다.

---

# 8. 메뉴 노출 정책

메뉴 노출은 최종적으로 Program 권한과 연결한다.

기본 원칙:

```
Menu 사용 = Y
AND Program 사용 = Y
AND User Role에 Program 권한 있음
→ Menu 노출
```

Folder/Group 메뉴는 하위 노출 메뉴가 하나도 없으면 숨기는 방향을 우선 검토한다.

HOME 등 공개/기본 Program 예외가 존재하면 현행 정책을 확인하고 별도 보고한다.

---

# 9. 조사 우선 항목

코드 수정 전에 반드시 다음 현황을 정리한다.

1. MENU_MGMT 현재 Frontend
2. 메뉴 DB Table / Seed
3. Menu Backend API
4. Program 연결 컬럼/테이블
5. Role / Permission 관련 DB
6. 사용자 ↔ Role 구조
7. Program Permission 구조
8. 버튼권한그룹과 Role 연결 구조 존재 여부
9. 현재 AppLayout / Navigation이 메뉴를 어디에서 읽는지
10. 현재 Backend 권한 Provider/Interceptor와 연결 가능한 지점

조사 후 기존 구조를 버리고 새 모델을 만드는 행위 금지.

---

# 10. 작업 단계

## Phase A — 현행 분석
- branch / worktree / git status 확인
- MENU / ROLE / PERMISSION Source / DB / API 현황 작성
- 재사용 가능 / 미구현 / 충돌 항목 구분

## Phase B — 메뉴관리
- 기존 Menu 관리 화면 보완
- Program 연결
- Menu 저장/조회
- Navigation Runtime 반영 가능한 구조 연결

## Phase C — 권한관리
- Role 기준 Program 권한 관리
- 선택 Program의 버튼권한그룹 관리
- 기존 EndpointPermissionProvider/Policy와 연결 가능한 계약 유지

## Phase D — Runtime 검증
가능한 범위에서:
- Role Program 권한에 따른 메뉴 표시
- Program 권한 없는 Menu 숨김
- 일반 Endpoint Program 권한
- 제한 Endpoint Program + 버튼그룹 권한
- 직접 URL/API 접근 차단 구조 확인

Host 인증이 없어 실제 사용자 컨텍스트 검증이 불가능한 경우 명확하게 미결로 남긴다.

---

# 11. 검증

필수:
- frontend lint
- frontend build
- backend test
- git diff --check

가능하면 브라우저:
- Menu CRUD
- Parent/Depth/순서
- Program 연결
- Role 선택
- Program 권한 저장
- 버튼권한그룹 저장
- 메뉴 노출 결과
- Empty / Loading / Error
- 기존 desktop 화면 회귀

---

# 12. 제외 범위

- SD 요구사항 분석 기능
- Endpoint Frontend dependency 자동추적
- 인증 시스템 전체 재설계
- SSO 신규 구현
- 사용자 계정관리 전체 재구축
- Menu와 무관한 COMMON 기능 확장

---

# 13. 완료 보고

RESULT 문서에 반드시 기록한다.

- 조사된 현재 메뉴/권한 구조
- 재사용한 기존 자산
- 변경 파일
- DB 변경
- 메뉴 → Program 연결 방식
- Role → Program 권한 구조
- Role → 버튼권한그룹 구조
- Runtime 메뉴 노출 방식
- Backend 권한검사 연결 상태
- lint/build/test 결과
- 브라우저 검증 결과
- 미결사항
- commit SHA

## 완료 기준

1. 메뉴와 Program 연결이 실제 저장/조회된다.
2. 권한관리에서 Role별 Program 권한을 관리할 수 있다.
3. Program별 버튼권한그룹을 Role에 추가 부여할 수 있다.
4. 메뉴 노출이 Program 권한 모델과 연결 가능한 상태가 된다.
5. Backend Endpoint 권한 정책과 모순되지 않는다.
6. 기존 Program / Endpoint 기능을 회귀시키지 않는다.
