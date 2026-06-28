# 04. Domain Standard

## 1. 목적

BaseKit의 도메인 표준은 화면, Mock Data, 타입, 향후 API 계약에서 **업무 용어와 필드 의미를 일관되게 유지하기 위한 기준**이다.

단순히 변수명을 예쁘게 맞추는 수준이 아니라, 다음 목적을 가진다.

* 업무 데이터의 의미를 명확하게 유지
* 화면과 데이터 구조 간 해석 차이 최소화
* Mock Data에서 실제 API 계약으로 확장 시 혼선 방지
* 화면 컬럼명, 상세 필드명, 타입 구조의 일관성 확보
* 향후 문서화 및 AI 매뉴얼 기능과 연결 가능한 용어 체계 유지

---

## 2. 기본 원칙

BaseKit 도메인 표준은 다음 원칙을 따른다.

* 업무 데이터는 업무 의미가 드러나는 명칭을 사용한다.
* 화면, Mock Data, 타입, API 계약 계층에서는 도메인 중심 명명 규칙을 유지한다.
* UI 내부 상태, 이벤트 핸들러, 컴포넌트 내부 임시 값은 React 관례에 맞는 camelCase를 사용할 수 있다.
* 공통적으로 반복되는 필드 패턴은 접미 규칙으로 통일한다.
* 코드성 값과 표시용 이름은 구분한다.

즉, “업무 데이터의 이름”과 “프론트엔드 내부 구현용 이름”을 분리해서 관리하는 것이 핵심이다.

---

## 3. 명명 계층 구분

### 3.1 도메인/타입/Mock/API 계층

이 계층은 **업무 용어 중심**으로 관리한다.

예시:

* `USER_ID`
* `LOGIN_ID`
* `USER_NAME`
* `ROLE_CODE`
* `USE_YN`
* `CREATED_AT`
* `UPDATED_AT`

이 명명은 화면 컬럼, Mock Data, 타입 정의, API 응답 구조까지 일관되게 유지하는 것을 목표로 한다.

### 3.2 UI 내부 상태/이벤트 처리 계층

이 계층은 React/TypeScript 구현 관례를 따른다.

예시:

* `selectedUser`
* `searchForm`
* `activeTabId`
* `isSidebarCollapsed`
* `handleSearch`
* `handleReset`

즉, 화면이 다루는 실제 업무 데이터는 도메인 명명으로 유지하고, UI 내부 제어 변수만 camelCase를 사용한다.

---

## 4. 기본 접미 규칙

반복되는 필드 패턴은 다음 접미 규칙을 우선 사용한다.

### 4.1 ID

식별자

예시:

* `USER_ID`
* `MENU_ID`
* `ROLE_ID`
* `COMPANY_ID`

### 4.2 CODE

코드값

예시:

* `ROLE_CODE`
* `USER_TYPE_CODE`
* `MENU_TYPE_CODE`
* `USE_YN`는 코드성 여부를 고려하되 Y/N 관례로 별도 관리 가능

### 4.3 NAME

표시명, 명칭

예시:

* `USER_NAME`
* `MENU_NAME`
* `ROLE_NAME`
* `COMPANY_NAME`

### 4.4 YN

Y/N 값

예시:

* `USE_YN`
* `DELETE_YN`
* `LOCK_YN`

### 4.5 AT

일시값

예시:

* `CREATED_AT`
* `UPDATED_AT`
* `LAST_LOGIN_AT`

### 4.6 DATE

날짜값

예시:

* `START_DATE`
* `END_DATE`
* `APPLY_DATE`

이 접미 규칙은 화면과 API 확장 시 의미를 빠르게 해석할 수 있게 해 준다.

---

## 5. 코드값과 표시값 구분

도메인 표준에서 중요한 원칙 중 하나는 **코드값과 표시명을 혼용하지 않는 것**이다.

예를 들어:

* `ROLE_CODE`: 실제 저장/판단용 코드값
* `ROLE_NAME`: 사용자에게 보여줄 표시명

또는:

* `USER_TYPE_CODE`: 내부 구분 값
* `USER_TYPE_NAME`: 화면 표시용 값

이 원칙을 지키면 다음 이점이 있다.

* 공통코드와 쉽게 연결 가능
* 조회 조건과 Grid 표시를 분리 가능
* 다국어/표시명 변경에 유연함
* 저장값과 화면값의 역할이 명확함

---

## 6. 현재 사용자관리 화면 기준 예시

사용자관리 화면은 1차 기준 패턴이므로, 여기서 사용하는 필드명을 도메인 표준 예시로 삼는다.

예시 필드:

* `USER_ID`
* `LOGIN_ID`
* `USER_NAME`
* `USER_TYPE_CODE`
* `ROLE_CODE`
* `COMPANY_ID`
* `COMPANY_NAME`
* `USE_YN`
* `CREATED_AT`
* `UPDATED_AT`

조회 조건에서도 가능한 한 같은 의미 체계를 유지한다.

예:

* 사용자 ID
* 사용자명
* 사용 여부
* 소속/회사
* 역할

단, 조회 조건 상태는 내부적으로 다음처럼 camelCase를 사용할 수 있다.

예:

* `loginId`
* `userName`
* `useYn`
* `companyId`
* `roleCode`

즉, **폼 상태는 camelCase, 실제 도메인 데이터는 도메인 필드명**으로 구분해서 써도 된다.

---

## 7. 메뉴 / 권한 / 공통코드 관련 예시

### 7.1 메뉴

* `MENU_ID`
* `PARENT_MENU_ID`
* `MENU_NAME`
* `MENU_LEVEL`
* `SORT_ORDER`
* `PROGRAM_ID`
* `USE_YN`

### 7.2 프로그램

* `PROGRAM_ID`
* `PROGRAM_NAME`
* `PROGRAM_PATH`
* `USE_YN`

### 7.3 역할/권한

* `ROLE_ID`
* `ROLE_CODE`
* `ROLE_NAME`
* `PERMISSION_ID`
* `ACTION_CODE`
* `USE_YN`

### 7.4 공통코드

* `GROUP_CODE`
* `GROUP_NAME`
* `CODE`
* `CODE_NAME`
* `SORT_ORDER`
* `USE_YN`

이처럼 각 영역에서도 동일한 접미 규칙을 유지한다.

---

## 8. 날짜/시간 기준

날짜와 시간 필드는 의미를 구분해서 관리한다.

### 8.1 날짜(Date)

시간이 중요하지 않은 값은 `*_DATE`를 사용한다.

예:

* `START_DATE`
* `END_DATE`
* `BIRTH_DATE`

### 8.2 일시(DateTime)

시각까지 중요한 값은 `*_AT`를 사용한다.

예:

* `CREATED_AT`
* `UPDATED_AT`
* `APPROVED_AT`
* `LAST_LOGIN_AT`

이 기준은 기존 결정문서인 날짜/시간 정책과 일관되게 유지한다.

---

## 9. UI 표시명과 도메인 필드의 관계

화면에서는 사용자가 이해하기 쉬운 한글 표시명을 사용하되, 내부 컬럼 키와 데이터 키는 도메인 표준을 유지한다.

예시:

| 화면 표시명 | 데이터 키                      |
| ------ | -------------------------- |
| 사용자 ID | `USER_ID`                  |
| 로그인 ID | `LOGIN_ID`                 |
| 사용자명   | `USER_NAME`                |
| 역할     | `ROLE_CODE` 또는 `ROLE_NAME` |
| 사용 여부  | `USE_YN`                   |
| 등록일시   | `CREATED_AT`               |

이 구조를 유지하면 화면 표시 문구가 바뀌어도 데이터 구조는 안정적으로 유지할 수 있다.

---

## 10. 공통코드 연결 원칙

`*_CODE` 형태의 필드는 가능한 한 공통코드 또는 기준정보와 연결 가능하도록 설계한다.

예시:

* `ROLE_CODE`
* `USER_TYPE_CODE`
* `MENU_TYPE_CODE`
* `STATUS_CODE`

단, 다음 항목은 별도 관리 대상을 고려할 수 있다.

* `COMPANY_ID` / `COMPANY_NAME`
* `ORG_ID` / `ORG_NAME`
* `ROLE_CODE` / `ROLE_NAME`

즉, 모든 코드가 단일 공통코드 테이블에 들어가는 것이 아니라, 도메인 중요도에 따라 별도 기준정보 테이블을 둘 수 있다.

---

## 11. 화면과 타입의 관계

도메인 표준은 단순히 Mock Data 키 이름만 정하는 것이 아니라, 타입 구조에도 그대로 반영되어야 한다.

예시:

* `User`
* `Role`
* `Menu`
* `Company`
* `CodeGroup`
* `Code`

타입 내부 필드도 동일한 도메인 키를 사용한다.

예:

```ts id="4tb0mk"
type User = {
  USER_ID: string;
  LOGIN_ID: string;
  USER_NAME: string;
  ROLE_CODE: string;
  USE_YN: 'Y' | 'N';
  CREATED_AT: string;
};
```

이 기준은 향후 실제 API 응답 구조와도 연결될 수 있다.

---

## 12. 도메인 명명과 UI compact 정책의 관계

이번 차수에서는 UI compact 조정과 함께 사용자관리 화면의 주요 필드 구성을 정리하였다.
이 과정에서도 도메인 필드명은 유지하고, 화면 밀도만 조정하는 방향을 따른다.

즉:

* 화면을 compact하게 줄이더라도
* 컬럼명과 필드명은 축약하지 않고
* 도메인 의미를 유지하는 쪽을 우선한다

업무시스템에서는 화면 밀도보다 데이터 해석 오류 방지가 더 중요하기 때문이다.

---

## 13. 현재 확정 / 미확정 구분

### 현재 확정된 사항

* 도메인/타입/Mock/API 계층은 업무 용어 중심 필드명 사용
* UI 내부 상태와 이벤트 핸들러는 camelCase 사용 가능
* `ID`, `CODE`, `NAME`, `YN`, `AT`, `DATE` 접미 규칙 사용
* 사용자관리 화면 기준 도메인 필드명 예시 확보
* 코드값과 표시값 분리 원칙 유지

### 아직 미확정인 사항

* 실제 API 응답 구조와 1:1로 동일하게 갈지 여부
* 공통코드/기준정보 테이블 분리 범위
* 일부 필드의 CODE vs ID 기준 세부 정리
* 백엔드 DTO와 프론트 타입의 변환 계층 도입 여부

즉, 현재는 도메인 명명 기준은 정리되었고, 실제 백엔드 연계 시 세부 매핑 정책은 후속 확정한다.

---

## 14. 정리

BaseKit의 도메인 표준은 화면 이름 규칙이 아니라, **업무 데이터의 의미를 안정적으로 유지하기 위한 공통 기준**이다.

현재까지의 방향은 다음과 같이 요약할 수 있다.

* 업무 데이터는 도메인 중심 명명 규칙을 사용한다.
* 타입/Mock/API는 같은 의미 체계를 유지한다.
* UI 내부 상태는 구현 편의를 위해 camelCase를 사용할 수 있다.
* 공통 접미 규칙을 통해 필드 의미를 빠르게 해석 가능하게 한다.
* 사용자관리 화면을 기준 예시로 삼아 다른 관리화면으로 확장한다.

이 문서는 이후 메뉴 문서, 권한 문서, 사용자관리/공통코드관리/메뉴관리 화면, API 계약, AI 매뉴얼 기능의 용어 체계와 연결되는 기준 문서로 사용한다.
