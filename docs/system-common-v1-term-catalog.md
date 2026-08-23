# 시스템 공통 V1 단어·용어 목록

## 상태 기준

- `기존`: 기존 용어집에 존재
- `승인`: 이번 설계에서 승인되어 단어집·용어집에 등록
- `검토`: 구조에는 필요하지만 단어·도메인 확정 전
- `대체`: 기존 표현을 다른 용어로 변경 예정

## 1. 사용 단어

| 논리 단어 | 물리 단어·약어 | 상태 | 주요 사용처 |
|---|---|---|---|
| 사용자 | USER | 기존 승인 | 사용자, 사용자역할 |
| 공급업체 | VENDOR | 신규 승인 | 공급업체, 공급업체사용자배정 |
| 사원 | EMP | 신규 승인 | 사원번호 |
| 회사 | COMPANY | 프로젝트 기준 | 회사ID·코드·명 |
| 조직 | ORG | 기존 프로젝트 기준 | 조직ID·코드·명 |
| 직무 | JOB | 승인 | 직무ID·코드·명 |
| 시스템 | SYSTEM | 검토 | 시스템ID·코드·명 |
| 계정 | ACCOUNT | 검토 | 사용자계정 |
| 역할 | ROLE | 검토 | 역할·사용자역할 |
| 프로그램 | PROGRAM | 프로젝트 예외 승인 | 프로그램·프로그램액션 |
| 메뉴 | MENU | 기존 승인 | 메뉴 |
| 액션 | ACTION | 검토 | 액션·권한 |
| 배정 | ASSIGN | 검토 | 내부·공급업체 사용자배정 |
| 번호 | NO | 기존 승인 | 사원번호 |
| 코드 | CODE | 기존 도메인 | 각종 코드 |
| 키 | KEY | 기존 도메인 | 메뉴·프로그램 키 |
| 명 | NAME | 기존 도메인 | 표시 명칭 |
| 일시 | AT | 기존 도메인 | 등록·수정·로그인 일시 |
| 일자 | DATE | 기존 도메인 | 유효기간 |
| 여부 | YN | 기존 승인 | 사용·잠금·허용 여부 |

## 2. 등록·승인 용어

| 논리 용어 | 물리명 | 도메인 | 상태 | 사용 테이블 |
|---|---|---|---|---|
| 회사ID | `COMPANY_ID` | ID | 승인 | 회사 및 참조 |
| 회사코드 | `COMPANY_CODE` | CODE | 기존 | 회사 |
| 회사명 | `COMPANY_NAME` | NAME | 기존 | 회사 |
| 조직코드 | `ORG_CODE` | CODE | 기존 | 조직 |
| 조직명 | `ORG_NAME` | NAME | 기존 | 조직 |
| 직무ID | `JOB_ID` | ID | 승인 | 직무·내부사용자배정 |
| 공급업체ID | `VENDOR_ID` | ID | 승인 | 공급업체·공급업체사용자배정 |
| 사용자ID | `USER_ID` | ID | 기존 | 사용자 및 참조 |
| 사용자명 | `USER_NAME` | NAME | 기존 | 사용자 |
| 사용자구분코드 | `USER_TYPE_CODE` | CODE | 승인 | 사용자·역할 |
| 로그인ID | `LOGIN_ID` | ID | 기존 | 사용자계정 |
| 이메일 | `EMAIL` | 전용 도메인 검토 | 기존 | 사용자 |
| 사원번호 | `EMP_NO` | NO | 승인 | 내부사용자배정 |
| 프로그램키 | `PROGRAM_KEY` | KEY | 기존 | 프로그램 |
| 프로그램명 | `PROGRAM_NAME` | NAME | 기존 | 프로그램 |
| 메뉴키 | `MENU_KEY` | KEY | 기존 | 메뉴 |
| 메뉴명 | `MENU_NAME` | NAME | 기존 | 메뉴 |
| 액션코드 | `ACTION_CODE` | CODE | 승인 | 액션·권한 |
| 액션명 | `ACTION_NAME` | NAME | 기존 | 액션 |
| 사용여부 | `USE_YN` | YN | 기존 | 공통 |
| 등록일시 | `CREATED_AT` | AT | 기존 | 공통 감사 |
| 등록자 | `CREATED_BY` | BY | 기존 | 공통 감사 |
| 수정일시 | `UPDATED_AT` | AT | 기존 | 공통 감사 |
| 수정자 | `UPDATED_BY` | BY | 기존 | 공통 감사 |

## 3. 신규 용어 검토 목록

### 기준정보

| 논리 용어 | 물리명 후보 | 사용 테이블 |
|---|---|---|
| 시스템ID | `SYSTEM_ID` | 시스템 및 참조 |
| 시스템코드 | `SYSTEM_CODE` | 시스템 |
| 시스템명 | `SYSTEM_NAME` | 시스템 |
| 시스템회사ID | `SYSTEM_COMPANY_ID` | 시스템회사 |
| 회사구분코드 | `COMPANY_TYPE_CODE` | 회사 |
| 조직ID | `ORG_ID` | 조직 및 참조 |
| 상위조직ID | `PARENT_ORG_ID` | 조직 |
| 조직레벨 | `ORG_LEVEL` | 조직 |
| 직무코드 | `JOB_CODE` | 직무 |
| 직무명 | `JOB_NAME` | 직무 |
| 공급업체코드 | `VENDOR_CODE` | 공급업체 |
| 공급업체상태코드 | `VENDOR_STATUS_CODE` | 공급업체 |

### 사용자·계정

| 논리 용어 | 물리명 후보 | 사용 테이블 |
|---|---|---|
| 계정ID | `ACCOUNT_ID` | 사용자계정 |
| 계정유형코드 | `ACCOUNT_TYPE_CODE` | 사용자계정 |
| 비밀번호해시 | `PASSWORD_HASH` | 사용자계정 |
| 잠금여부 | `LOCKED_YN` | 사용자계정 |
| 로그인실패수 | `LOGIN_FAIL_COUNT` | 사용자계정 |
| 마지막로그인일시 | `LAST_LOGIN_AT` | 사용자계정 |
| 비밀번호변경일시 | `PASSWORD_CHANGED_AT` | 사용자계정 |
| 계정만료일시 | `ACCOUNT_EXPIRED_AT` | 사용자계정 |
| 휴대전화번호 | `MOBILE_PHONE_NO` | 사용자 |
| 언어코드 | `LANGUAGE_CODE` | 사용자·회사 |
| 시간대ID | `TIMEZONE_ID` | 사용자·회사 |
| 상태코드 | `STATUS_CODE` | 사용자·회사 |

### 소속·배정

| 논리 용어 | 물리명 후보 | 사용 테이블 |
|---|---|---|
| 내부사용자배정ID | `INTERNAL_USER_ASSIGN_ID` | 내부사용자배정 |
| 공급업체사용자배정ID | `VENDOR_USER_ASSIGN_ID` | 공급업체사용자배정 |
| 기본여부 | `PRIMARY_YN` | 사용자 배정 |
| 승인상태코드 | `APPROVAL_STATUS_CODE` | 공급업체사용자배정 |
| 유효시작일자 | `VALID_FROM_DATE` | 배정·공급업체 |
| 유효종료일자 | `VALID_TO_DATE` | 배정·공급업체 |

### 프로그램·권한

| 논리 용어 | 물리명 후보 | 사용 테이블 |
|---|---|---|
| 프로그램ID | `PROGRAM_ID` | 프로그램 및 참조 |
| 메뉴ID | `MENU_ID` | 메뉴 |
| 상위메뉴ID | `PARENT_MENU_ID` | 메뉴 |
| 액션ID | `ACTION_ID` | 액션 |
| 프로그램액션ID | `PROGRAM_ACTION_ID` | 프로그램액션 |
| 역할ID | `ROLE_ID` | 역할 및 참조 |
| 역할코드 | `ROLE_CODE` | 역할 |
| 역할명 | `ROLE_NAME` | 역할 |
| 역할프로그램액션ID | `ROLE_PROGRAM_ACTION_ID` | 역할프로그램액션 |
| 사용자역할ID | `USER_ROLE_ID` | 사용자역할 |
| 데이터범위코드 | `DATA_SCOPE_CODE` | 역할 |
| 허용여부 | `ALLOW_YN` | 역할프로그램액션 |
| 감사여부 | `AUDIT_YN` | 액션 |
| 화면유형코드 | `SCREEN_TYPE_CODE` | 프로그램 |
| 경로 | `ROUTE_PATH` | 프로그램 |
| 컴포넌트키 | `COMPONENT_KEY` | 프로그램 |
| 정렬순서 | `SORT_ORDER` | 조직·직무·메뉴·프로그램액션 |

## 4. 축약 규칙 검토안

긴 물리명은 개발자가 임의로 줄이지 않고 승인된 프로젝트 약어만 사용한다.

| 논리 단어 | 약어 후보 | 예시 |
|---|---|---|
| 공급업체 | `VENDOR` | `VENDOR_ID` |
| 사원 | `EMP` | `EMP_NO` |
| 배정 | `ASSIGN` | `VENDOR_USER_ASSIGN_ID` |
| 내부 | `INTERNAL` | `INTERNAL_USER_ASSIGN_ID` |
| 프로그램 | `PROGRAM` | `PROGRAM_ACTION_ID` |
| 조직 | `ORG` | `PARENT_ORG_ID` |
| 번호 | `NO` | `EMP_NO` |
| 코드 | `CODE` | `ROLE_CODE` |
| 일시 | `AT` | `LAST_LOGIN_AT` |
| 일자 | `DATE` | `VALID_FROM_DATE` |

V1 권장 제한은 테이블명 30자 이내, 컬럼명 30자 이내다. 초과할 경우 임의 축약하지 않고 이 목록에 약어를 먼저 등록한다.

## 5. 대체·폐기 예정

| 기존 용어 | 대체 용어 | 사유 |
|---|---|---|
| 사용자구분 / `USER_TYPE` | 사용자구분코드 / `USER_TYPE_CODE` | CODE 접미 규칙 |
| 액션키 / `ACTION_KEY` | 액션코드 / `ACTION_CODE` | 권한 계약 통일 |
| 표시순서 / `DISPLAY_ORDER` | 정렬순서 / `SORT_ORDER` | 표시 단어 폐기 및 공통 정렬 의미 |
| SUPPLIER, PARTNER | VENDOR | 구매시스템 외부 사용자 명칭 통일 |
| EMPLOYEE | EMP | 긴 단어 축약 승인 |
