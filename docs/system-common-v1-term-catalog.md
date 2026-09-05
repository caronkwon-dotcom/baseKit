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

컬럼명은 30자 이내를 권장한다. 테이블명은 ADR 017에 따라 정확히 7자리로 고정하며 임의 축약하지 않고 4자리 테이블 코드를 먼저 등록한다.

## 5. 테이블 코드 및 SQL Alias

| 논리 테이블 | 물리 테이블명 | 기본 Alias | Full Name | 상태 |
|---|---|---|---|---|
| 시스템 | `BSYSYST` | `SYST` | BaseKit System System | 명칭 검토 |
| 회사 | `BSYCOMP` | `COMP` | BaseKit System Company | 확정 |
| 시스템회사 | `BSYSYCO` | `SYCO` | BaseKit System System Company | 명칭 검토 |
| 조직 | `BSYORGN` | `ORGN` | BaseKit System Organization | 확정 |
| 직무 | `BSYJOBM` | `JOBM` | BaseKit System Job Master | 확정 |
| 공급업체 | `BSYVNDR` | `VNDR` | BaseKit System Vendor | 확정 |
| 사용자 | `BSYUSRM` | `USRM` | BaseKit System User Master | 예약어 회피 확정 |
| 사용자계정 | `BSYUACT` | `UACT` | BaseKit System User Account | 확정 |
| 내부사용자배정 | `BSYIUAS` | `IUAS` | BaseKit System Internal User Assignment | 명칭 검토 |
| 공급업체사용자배정 | `BSYVUAS` | `VUAS` | BaseKit System Vendor User Assignment | 명칭 검토 |
| 프로그램 | `BSYPROG` | `PROG` | BaseKit System Program | 확정 |
| 메뉴 | `BSYMENU` | `MENU` | BaseKit System Menu | 확정 |
| 액션 | `BSYACTN` | `ACTN` | BaseKit System Action | 확정 |
| 프로그램액션 | `BSYPACT` | `PACT` | BaseKit System Program Action | 확정 |
| 역할 | `BSYROLE` | `ROLE` | BaseKit System Role | 확정 |
| 역할프로그램액션 | `BSYRPAC` | `RPAC` | BaseKit System Role Program Action | 명칭 검토 |
| 사용자역할 | `BSYUROL` | `UROL` | BaseKit System User Role | 확정 |
| 코드그룹 | `BSYCDGP` | `CDGP` | BaseKit System Code Group | 확정 |
| 공통코드 | `BSYCMCD` | `CMCD` | BaseKit System Common Code | 사용자 예시 확정 |

검토 대상은 의미가 겹치거나 축약만으로 바로 이해하기 어려운 `SYST`, `SYCO`, `IUAS`, `VUAS`, `RPAC`이다. 중복은 없으며 확정 전까지 Schema Draft로 유지한다.

## 6. 대체·폐기 예정

| 기존 용어 | 대체 용어 | 사유 |
|---|---|---|
| 사용자구분 / `USER_TYPE` | 사용자구분코드 / `USER_TYPE_CODE` | CODE 접미 규칙 |
| 액션키 / `ACTION_KEY` | 액션코드 / `ACTION_CODE` | 권한 계약 통일 |
| 표시순서 / `DISPLAY_ORDER` | 정렬순서 / `SORT_ORDER` | 표시 단어 폐기 및 공통 정렬 의미 |
| SUPPLIER, PARTNER | VENDOR | 구매시스템 외부 사용자 명칭 통일 |
| EMPLOYEE | EMP | 긴 단어 축약 승인 |
