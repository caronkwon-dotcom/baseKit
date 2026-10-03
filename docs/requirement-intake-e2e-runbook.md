# Requirement Intake 실데이터 E2E 준비 Runbook

상태: 실행 준비 완료, 실제 E2E는 Database 접속 환경 승인 후 수행

이 문서는 Requirement Intake Excel Import를 화면에서 실제 데이터로 검수하기 위한 실행 기준이다. 테스트 코드의 H2 구조를 바꾸지 않으며, 운영 Database를 선택하거나 운영 데이터를 생성하지 않는다.

## 1. 검수 대상과 경계

검수 대상은 다음 한 흐름이다.

`Project Context 선택 → Project Menu 실데이터 준비 → Excel Template 다운로드 → 실제 Excel 작성 → Upload Preview → Import → Backend 저장 → 새로고침 조회 → 단일/복수 PROJECT_MENU_IDS 확인`

다음 항목은 이번 E2E 범위에 포함하지 않는다.

- 운영 Database 채택, 접속정보 확정, 운영 데이터 정리
- OCR, LLM, AI 분석 실행 또는 결과 저장
- Project Master/Frontend Menu Metadata의 Backend 이전
- 요구사항 간 관계와 WBS/Screen/Table Traceability 저장

## 2. 데이터 준비 원칙

- 프로젝트는 기존 Project 관리 화면에서 확인한 실제 `PROJECT_ID`를 사용한다. 기본 예시는 `SDP-001`이지만 환경에 없으면 현재 화면에 존재하는 ID를 기록한다.
- Project Menu는 Project Menu 화면에서 현재 프로젝트에 실제로 저장한다. Excel의 `PROJECT_MENU_PATHS`에는 저장된 메뉴의 화면 표시 경로를 그대로 사용한다.
- 메뉴 ID나 이름을 코드에 임의로 추가하지 않는다. 메뉴 후보와 ID는 Backend Project Menu API 응답을 기준으로 기록한다.
- Requirement 입력은 Excel 파일에서 읽은 값을 사용하고, 브라우저가 생성하는 `PROJECT_ID`와 `PROJECT_MENU_IDS` 매핑만 시스템 책임으로 확인한다.
- 재실행 검수에서는 동일 파일을 다시 Import하지 않고, 새 파일의 고유한 `REQUIREMENT_ID` 또는 빈 ID를 사용해 중복 판정을 확인한다.

## 3. 사전 조건

| 확인 | 기준 |
|---|---|
| Backend | Requirement API와 Flyway가 기동되어 있고 `/api/health`가 정상이다 |
| Frontend | Backend API Base URL로 요청이 연결된다 |
| Project | 선택 가능한 실제 프로젝트가 1개 이상 존재한다 |
| Project Menu | 동일 프로젝트에 LEVEL 메뉴 2개 이상이 저장되어 있고, 1개는 하위 메뉴 경로를 구성한다 |
| Excel | `.xlsx` 파일을 생성·편집할 수 있다 |
| 저장소 | 첨부파일 E2E를 할 경우 로컬 저장 경로가 쓰기 가능하다 |
| DB 판정 | 실제 E2E 대상 DB는 ADR-033의 승인된 환경이어야 하며, 미결정 상태에서는 실행 완료로 표시하지 않는다 |

## 4. 권장 실데이터 시나리오

실제 Project Menu API 응답에서 다음 조건을 만족하는 두 경로를 골라 Excel에 입력한다.

| 행 | `REQUIREMENT_ID` | `REQUIREMENT_NAME` | `REQUIREMENT_TYPE_CODE` | `STATUS` | `PROJECT_MENU_PATHS` |
|---|---|---|---|---|---|
| 1 | 빈 값 또는 새 ID | 실제 업무 요구사항 1 | 실제 활성 코드 | `DRAFT` | 단일 저장 메뉴 경로 |
| 2 | 빈 값 또는 새 ID | 실제 업무 요구사항 2 | 실제 활성 코드 | `REVIEW` | `상위 > 하위 \| 다른 메뉴 경로` |

각 행의 `DESCRIPTION`과 `PROCESS_DESCRIPTION`은 테스트용 문장이 아니라 검수자가 확인 가능한 업무 설명을 사용한다. 파일에는 위 표의 헤더 외에 임의의 컬럼을 넣지 않는다.

## 5. 실행 절차와 합격 기준

1. Backend와 Frontend를 승인된 E2E 환경으로 기동한다.
2. Standard Design에서 실제 프로젝트 Context를 선택한다.
3. Project Menu 화면에서 메뉴 2개 이상을 확인하고, 사용한 `PROJECT_MENU_ID`, `MENU_ID`, 메뉴명, 경로를 검수 기록에 남긴다.
4. Requirement 화면에서 Excel Template을 다운로드한다.
5. 실제 업무 설명으로 2행 이상의 `.xlsx`를 작성한다. 한 행에는 단일 메뉴, 한 행에는 복수 메뉴를 입력한다.
6. Excel Upload를 실행하고 Preview에서 전체 행 수, 정상 행 수, 오류 행 수를 확인한다.
7. 오류가 없을 때만 Import를 실행한다.
8. 완료 메시지와 목록 행을 확인한다.
9. 새로고침 후 같은 프로젝트를 다시 선택하고 저장된 행이 유지되는지 확인한다.
10. 각 행의 관련 메뉴 탭에서 단일/복수 메뉴가 각각 보이는지 확인한다.
11. Backend `GET /api/standard-design/requirements?PROJECT_ID=...` 응답에서 `PROJECT_MENU_IDS`를 확인하고, 화면에 기록한 Project Menu ID와 일치시키기 위해 증적을 남긴다.
12. 필요하면 저장된 Requirement 하나에 실제 이미지 1개를 첨부하고, Preview·삭제 후 새로고침 결과를 확인한다. OCR/분석 상태가 바뀌지 않는 것은 정상이다.

합격 기준은 다음과 같다.

- Template 헤더와 실제 업로드 파일 헤더가 일치한다.
- Preview 단계에서 Backend 저장 요청이 발생하지 않는다.
- 유효하지 않은 메뉴 경로·중복 ID·코드 값은 Preview 오류로 차단된다.
- Import 후 목록과 API 응답에 같은 `PROJECT_ID`의 행이 저장된다.
- 새로고침 뒤 이름, 설명, 상태, 단일/복수 `PROJECT_MENU_IDS`가 유지된다.
- H2 통합 테스트 통과와 브라우저 실 E2E 통과를 별도 증적으로 기록한다.

## 6. 검수 증적 양식

실행 시 아래 표를 복사하여 날짜와 환경을 채운다. 비밀키, Token, DB 접속 문자열은 기록하지 않는다.

| 항목 | 기록 |
|---|---|
| 실행일 / 실행자 |  |
| Git commit |  |
| Frontend URL |  |
| Backend URL |  |
| E2E DB 종류/환경명 | 승인된 환경명만, 접속정보 제외 |
| 실제 `PROJECT_ID` |  |
| 사용한 Project Menu ID·경로 |  |
| Excel 파일명/행 수 |  |
| Preview 정상/오류 건수 |  |
| 저장 후 Requirement ID |  |
| 단일 `PROJECT_MENU_IDS` 확인 | PASS / FAIL |
| 복수 `PROJECT_MENU_IDS` 확인 | PASS / FAIL |
| 새로고침 유지 | PASS / FAIL |
| 첨부 Preview/삭제 | PASS / FAIL / 미실행 |
| 미검증·차단 사유 |  |

## 7. 현재 차단 사항

- 현재 브랜치에서는 H2 통합 테스트 구조를 유지한다.
- 실제 브라우저 E2E의 Database 환경은 ADR-033에 따라 승인된 PostgreSQL 또는 프로젝트가 채택한 Database가 필요하다. 이번 문서는 그 선택을 대신하지 않는다.
- local H2 기동 오류가 재현되면 이를 실 E2E 합격으로 간주하지 않고, Backend 기동 로그와 환경 문제로 별도 보고한다.

