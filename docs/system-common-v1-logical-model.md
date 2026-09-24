# 시스템 공통 V1 상세 논리 모델

## 상태

`DRAFT - 컬럼 및 용어 승인 전`

구조 결정은 `docs/system-common-v1-db-design.md`에서 승인되었다. 이 문서는 DDL 작성 전에 전체 논리 컬럼, 관계, 제약조건과 용어 상태를 검토하기 위한 상세안이다.

## 공통 컬럼

별도 언급이 없는 기준정보·배정·권한 테이블은 다음 감사 컬럼을 가진다.

| 논리명 | 물리명 | 도메인 | 상태 |
|---|---|---|---|
| 등록일시 | `REG_DT` | DT | 승인 용어 |
| 등록자 | `REG_BY` | BY | 기존 용어 |
| 수정일시 | `MOD_DT` | DT | 승인 용어 |
| 수정자 | `MOD_BY` | BY | 기존 용어 |
| 사용여부 | `USE_YN` | YN | 기존 용어 |
| 삭제여부 | `DEL_YN` | YN | 승인 용어 |

`USE_YN`은 일시적 사용 중지, `DEL_YN`은 논리 삭제다. 일반 조회는 `DEL_YN = 'N'`, 실제 사용 가능한 선택 목록은 `USE_YN = 'Y' AND DEL_YN = 'N'`을 기본 조건으로 한다.

## 1. 시스템

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 시스템ID | `SYSTEM_ID` | Y | PK | 신규 검토 |
| 시스템코드 | `SYSTEM_CODE` | Y | UK | 신규 검토 |
| 시스템명 | `SYSTEM_NAME` | Y |  | 신규 검토 |
| 설명 | `DESCRIPTION` | N |  | 신규 검토 |
| 기본언어코드 | `DEFAULT_LANGUAGE_CODE` | Y | 공통코드 | 신규 검토 |
| 기본시간대ID | `DEFAULT_TIMEZONE_ID` | Y |  | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

## 2. 회사

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 회사ID | `COMPANY_ID` | Y | PK | 이번 승인 |
| 회사코드 | `COMPANY_CODE` | Y | UK | 기존 용어 |
| 회사명 | `COMPANY_NAME` | Y |  | 기존 용어 |
| 회사구분코드 | `COMPANY_TYPE_CODE` | Y | INTERNAL/VENDOR | 신규 검토 |
| 사업자등록번호 | `BUSINESS_REGISTRATION_NO` | N | 국가별 선택 | 신규 검토 |
| 대표자명 | `REPRESENTATIVE_NAME` | N |  | 신규 검토 |
| 국가코드 | `COUNTRY_CODE` | Y | 공통코드 | 신규 검토 |
| 언어코드 | `LANGUAGE_CODE` | Y | 공통코드 | 신규 검토 |
| 시간대ID | `TIMEZONE_ID` | Y | IANA Time Zone | 신규 검토 |
| 상태코드 | `STATUS_CODE` | Y | 공통코드 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

회사코드는 BaseKit 설치 단위에서 유일하게 관리한다. 고객사에서 법인·사업장을 분리해야 할 경우 회사 하위 확장 모델로 추가한다.

## 3. 시스템회사

시스템별 접근 가능한 회사를 명시해 회사가 존재한다는 이유만으로 모든 시스템에 접근하지 못하게 한다.

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 시스템회사ID | `SYSTEM_COMPANY_ID` | Y | PK | 신규 검토 |
| 시스템ID | `SYSTEM_ID` | Y | FK | 신규 검토 |
| 회사ID | `COMPANY_ID` | Y | FK | 이번 승인 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

`SYSTEM_ID + COMPANY_ID`는 Unique다.

## 4. 조직

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 조직ID | `ORG_ID` | Y | PK | 신규 검토 |
| 회사ID | `COMPANY_ID` | Y | FK | 이번 승인 |
| 상위조직ID | `PARENT_ORG_ID` | N | 자기참조 FK | 신규 검토 |
| 조직코드 | `ORG_CODE` | Y | 회사 내 UK | 기존 용어 |
| 조직명 | `ORG_NAME` | Y |  | 기존 용어 |
| 조직레벨 | `ORG_LEVEL` | Y | 1 이상 | 신규 검토 |
| 정렬순서 | `SORT_ORDER` | Y | 0 이상 | 신규 검토 |
| 유효시작일자 | `VALID_FROM_DATE` | Y |  | 신규 검토 |
| 유효종료일자 | `VALID_TO_DATE` | N | 시작일자 이후 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

메뉴의 표시순서와 같은 정렬 의미를 공통으로 사용할지 `SORT_ORDER`와 함께 용어 검토가 필요하다.

## 5. 직무

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 직무ID | `JOB_ID` | Y | PK | 이번 승인 |
| 직무코드 | `JOB_CODE` | Y | UK | 신규 검토 |
| 직무명 | `JOB_NAME` | Y |  | 신규 검토 |
| 설명 | `DESCRIPTION` | N |  | 신규 검토 |
| 정렬순서 | `SORT_ORDER` | Y | 0 이상 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

직무는 직급·직책과 구분한다. V1에서는 구매담당, 검수담당 등 업무 책임 분류에 사용한다.

## 6. 공급업체

공급업체는 외부 회사의 1:1 확장정보다.

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 공급업체ID | `VENDOR_ID` | Y | PK | 승인·등록 |
| 회사ID | `COMPANY_ID` | Y | FK, UK | 이번 승인 |
| 공급업체코드 | `VENDOR_CODE` | Y | UK | 신규 검토 |
| 공급업체상태코드 | `VENDOR_STATUS_CODE` | Y | 공통코드 | 신규 검토 |
| 유효시작일자 | `VALID_FROM_DATE` | Y |  | 신규 검토 |
| 유효종료일자 | `VALID_TO_DATE` | N | 시작일자 이후 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

공급업체명은 회사명에서 조회하며 중복 저장하지 않는다.

## 7. 사용자

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 사용자ID | `USER_ID` | Y | PK | 기존 용어 |
| 사용자명 | `USER_NAME` | Y |  | 기존 용어 |
| 사용자구분코드 | `USER_TYPE_CODE` | Y | INTERNAL/VENDOR | 이번 승인 |
| 이메일 | `EMAIL` | N | 형식 검증 | 기존 용어, 도메인 재검토 |
| 휴대전화번호 | `MOBILE_PHONE_NO` | N |  | 신규 검토 |
| 언어코드 | `LANGUAGE_CODE` | Y | 공통코드 | 신규 검토 |
| 시간대ID | `TIMEZONE_ID` | Y | IANA Time Zone | 신규 검토 |
| 상태코드 | `STATUS_CODE` | Y | 공통코드 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

사용자구분은 V1에서 상호배타적이다. 내부 사용자는 내부사용자배정만, 공급업체 사용자는 공급업체사용자배정만 가질 수 있다.

## 8. 사용자계정

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 계정ID | `ACCOUNT_ID` | Y | PK | 신규 검토 |
| 사용자ID | `USER_ID` | Y | FK | 기존 용어 |
| 로그인ID | `LOGIN_ID` | Y | UK | 기존 용어 |
| 계정유형코드 | `ACCOUNT_TYPE_CODE` | Y | LOCAL/SSO | 신규 검토 |
| 비밀번호해시 | `PASSWORD_HASH` | 조건부 | LOCAL 계정 필수 | 신규 단어 검토 |
| 잠금여부 | `LOCKED_YN` | Y | Y/N | 신규 검토 |
| 로그인실패수 | `LOGIN_FAIL_COUNT` | Y | 0 이상 | 신규 검토 |
| 마지막로그인일시 | `LAST_LOGIN_AT` | N |  | 신규 검토 |
| 비밀번호변경일시 | `PASSWORD_CHANGED_AT` | N |  | 신규 검토 |
| 계정만료일시 | `ACCOUNT_EXPIRED_AT` | N |  | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

비밀번호 원문은 저장하지 않는다. 상세 해시 알고리즘과 SSO Identity 구조는 로그인 설계에서 확정한다.

## 9. 내부사용자배정

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 내부사용자배정ID | `INTERNAL_USER_ASSIGN_ID` | Y | PK | ASSIGN 축약 검토 |
| 사용자ID | `USER_ID` | Y | FK | 기존 용어 |
| 회사ID | `COMPANY_ID` | Y | FK | 이번 승인 |
| 조직ID | `ORG_ID` | Y | FK | 신규 검토 |
| 직무ID | `JOB_ID` | N | FK | 이번 승인 |
| 사원번호 | `EMP_NO` | N | 회사 내 UK 후보 | 승인·등록 |
| 기본여부 | `PRIMARY_YN` | Y | 사용자별 하나 | 신규 검토 |
| 유효시작일자 | `VALID_FROM_DATE` | Y |  | 신규 검토 |
| 유효종료일자 | `VALID_TO_DATE` | N | 시작일자 이후 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

## 10. 공급업체사용자배정

| 논리 컬럼 | 물리명 후보 | 필수 | 키/규칙 | 용어 상태 |
|---|---|---:|---|---|
| 공급업체사용자배정ID | `VENDOR_USER_ASSIGN_ID` | Y | PK | ASSIGN 축약 검토 |
| 사용자ID | `USER_ID` | Y | FK | 기존 용어 |
| 공급업체ID | `VENDOR_ID` | Y | FK | 승인·등록 |
| 기본여부 | `PRIMARY_YN` | Y | 사용자별 하나 | 신규 검토 |
| 승인상태코드 | `APPROVAL_STATUS_CODE` | Y | 공통코드 | 신규 검토 |
| 유효시작일자 | `VALID_FROM_DATE` | Y |  | 신규 검토 |
| 유효종료일자 | `VALID_TO_DATE` | N | 시작일자 이후 | 신규 검토 |
| 사용여부 | `USE_YN` | Y | Y/N | 기존 용어 |

## 11. 프로그램·메뉴·액션

### 프로그램

`PROGRAM_ID(PK)`, `SYSTEM_ID(FK)`, `PROGRAM_KEY(UK)`, `PROGRAM_NAME`, `ROUTE_PATH`, `SCREEN_TYPE_CODE`, `COMPONENT_KEY`, `USE_YN`과 감사 컬럼을 사용한다.

### 메뉴

`MENU_ID(PK)`, `SYSTEM_ID(FK)`, `PARENT_MENU_ID(자기참조)`, `PROGRAM_ID(선택 FK)`, `MENU_KEY(UK)`, `MENU_NAME`, `MENU_LEVEL`, `MENU_TYPE_CODE`, `SORT_ORDER`, `USE_YN`과 감사 컬럼을 사용한다.

- GROUP 메뉴는 PROGRAM_ID가 없다.
- PROGRAM 메뉴는 PROGRAM_ID가 필수다.
- MENU_LEVEL은 1~3만 허용한다.

### 액션

`ACTION_ID(PK)`, `ACTION_CODE(UK)`, `ACTION_NAME`, `AUDIT_YN`, `USE_YN`과 감사 컬럼을 사용한다.

### 프로그램액션

`PROGRAM_ACTION_ID(PK)`, `PROGRAM_ID(FK)`, `ACTION_ID(FK)`, `SORT_ORDER`, `USE_YN`과 감사 컬럼을 사용한다. `PROGRAM_ID + ACTION_ID`는 Unique다.

## 12. 역할·권한

### 역할

`ROLE_ID(PK)`, `SYSTEM_ID(FK)`, `ROLE_CODE`, `ROLE_NAME`, `USER_TYPE_CODE`, `DATA_SCOPE_CODE`, `DESCRIPTION`, `USE_YN`과 감사 컬럼을 사용한다. `SYSTEM_ID + ROLE_CODE`는 Unique다.

### 역할프로그램액션

`ROLE_PROGRAM_ACTION_ID(PK)`, `ROLE_ID(FK)`, `PROGRAM_ACTION_ID(FK)`, `ALLOW_YN`과 감사 컬럼을 사용한다. 두 FK 조합은 Unique다.

### 사용자역할

`USER_ROLE_ID(PK)`, `USER_ID(FK)`, `ROLE_ID(FK)`, `VALID_FROM_DATE`, `VALID_TO_DATE`, `USE_YN`과 감사 컬럼을 사용한다.

내부 역할은 내부 사용자에게만, 공급업체 역할은 공급업체 사용자에게만 배정한다. `COMMON` 역할은 명시적으로 승인된 공통 프로그램에만 사용한다.

## 13. 관계와 물리 FK 추천

| 자식 → 부모 | 등급 | 물리 FK | 삭제 규칙 |
|---|---|---:|---|
| 시스템회사 → 시스템/회사 | REQUIRED | Y | RESTRICT |
| 조직 → 회사 | REQUIRED | Y | RESTRICT |
| 조직 → 상위조직 | RECOMMENDED | Y | RESTRICT |
| 공급업체 → 회사 | REQUIRED | Y | RESTRICT |
| 사용자계정 → 사용자 | REQUIRED | Y | RESTRICT |
| 내부사용자배정 → 사용자/회사/조직 | REQUIRED | Y | RESTRICT |
| 내부사용자배정 → 직무 | RECOMMENDED | Y | RESTRICT |
| 공급업체사용자배정 → 사용자/공급업체 | REQUIRED | Y | RESTRICT |
| 프로그램/메뉴/역할 → 시스템 | REQUIRED | Y | RESTRICT |
| 프로그램액션 → 프로그램/액션 | REQUIRED | Y | RESTRICT |
| 역할프로그램액션 → 역할/프로그램액션 | REQUIRED | Y | RESTRICT |
| 사용자역할 → 사용자/역할 | REQUIRED | Y | RESTRICT |

모든 관계의 기본 삭제 규칙은 RESTRICT다. V1에서는 CASCADE DELETE를 사용하지 않는다.

## 14. 추가 용어 승인 Queue

다음 묶음은 상세 모델에 필요하지만 아직 terms.json에 없으므로 DDL 전에 승인해야 한다.

### A. 식별·기준정보

`시스템ID`, `시스템코드`, `시스템명`, `회사구분코드`, `조직ID`, `상위조직ID`, `직무코드`, `직무명`, `공급업체코드`, `공급업체상태코드`, `계정ID`, `역할ID`, `역할코드`, `역할명`

### B. 사용자·보안

`계정유형코드`, `비밀번호해시`, `잠금여부`, `로그인실패수`, `마지막로그인일시`, `비밀번호변경일시`, `계정만료일시`, `휴대전화번호`

### C. 소속·유효기간

`내부사용자배정ID`, `공급업체사용자배정ID`, `사원번호`, `기본여부`, `승인상태코드`, `유효시작일자`, `유효종료일자`

### D. 프로그램·권한

`프로그램ID`, `메뉴ID`, `상위메뉴ID`, `액션ID`, `프로그램액션ID`, `역할프로그램액션ID`, `사용자역할ID`, `데이터범위코드`, `허용여부`, `감사여부`, `경로`, `컴포넌트키`, `표시순서`

### E. 공통 도메인

- 이메일 전용 길이 도메인
- 비밀번호해시 전용 길이 도메인
- 전화번호 도메인
- 상태·유형·범위 코드 도메인
- 수량형 로그인실패수 도메인

## 15. 구현 Gate

1. 추가 용어 승인 Queue의 단어 존재·상태와 유사어를 확인한다.
2. 단어가 없으면 신규 단어 후보를 먼저 승인한다.
3. 마지막 도메인 단어와 데이터 타입·길이를 확정한다.
4. 상세 논리 모델을 승인한다.
5. ERD와 인덱스·Unique·Check Constraint를 작성한다.
6. Flyway V2와 JPA Entity 초안을 생성한다.

## 16. 단어 대조 결과

`frontend/meta/words.json`과 정확 일치로 확인한 결과다.

### 등록 단어 조합 가능

- 공급업체: `공급 + 업체`
- 사업자등록번호: 등록된 도메인 단어로 존재
- 계정, 유형, 비밀번호, 잠금, 로그인, 실패, 변경, 만료, 내부, 배정, 기본, 승인, 역할, 범위, 허용, 경로는 등록 단어가 존재한다.

대부분 `IMPORTED` 상태이므로 용어 생성 전 이번 WBS 사용분만 검수완료로 승격해야 한다.

### 신규 단어 필요

| 논리 단어 | BaseKit 약어 후보 | 용도 | 추천 |
|---|---|---|---|
| 시간대 | `TIMEZONE` | TIMEZONE_ID | 신규 승인 |
| 휴대전화 | `MOBILE_PHONE` | MOBILE_PHONE_NO | 신규 승인 |
| 해시 | `HASH` | PASSWORD_HASH | 신규 승인 |
| 마지막 | `LAST` | LAST_LOGIN_AT | 신규 승인 |
| 사원 | `EMP` | EMP_NO | 승인·등록 |
| 액션 | `ACTION` | ACTION_ID/CODE/NAME | 기존 Architecture 용어로 신규 승인 |
| 데이터 | `DATA` | DATA_SCOPE_CODE | 기존 Architecture 용어로 신규 승인 |
| 컴포넌트 | `COMPONENT` | COMPONENT_KEY | Frontend Registry 계약으로 신규 승인 |

### 공공표준 폐기 단어 예외

| 단어 | 현재 상태 | BaseKit 결정 후보 |
|---|---|---|
| 프로그램 | `PRGRM / RETIRED` | 기존 BaseKit의 `PROGRAM`을 프로젝트 승인 단어로 별도 유지 |
| 표시 | `INDCT / RETIRED` | 사용하지 않고 `정렬순서 / SORT_ORDER`로 변경 |

### 명칭 변경 추천

- `표시순서(DISPLAY_ORDER)`는 `정렬순서(SORT_ORDER)`로 변경한다.
- `마지막로그인일시(LAST_LOGIN_AT)`는 UI 이해도가 높아 유지하며 `마지막` 단어를 신규 등록한다.
- `공급업체`는 BaseKit 프로젝트 단어로 등록하고 물리명은 `VENDOR`를 사용한다.
- 공공표준에서 폐기된 `프로그램`은 BaseKit Architecture의 핵심 개념이므로 예외 사유와 사용처를 남기고 프로젝트 표준으로 승인한다.
