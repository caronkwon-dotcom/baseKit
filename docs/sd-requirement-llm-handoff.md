# SD 요구사항 Excel·LLM 분석·설계 대상 프로그램 현황과 인계 요청 (2026-10-05)

기준: `sd-work` HEAD `75f6253` (현재도 동일, `origin/sd-work`와 일치). 코드 구현, 설계 문서, 미결정을 구분한다.

## 1. 현재 구현 상태

| 영역 | 상태 |
|---|---|
| 요구사항 Backend (CRUD·첨부·메뉴 관계) | 구현 (ADR-031, Flyway V5) |
| 요구사항 Excel 입력 | **이번 작업에서 구현**: 공통 `ExcelImportDialog` 재사용, 양식 다운로드, 행 검증(유형·상태 공통코드, 프로젝트 메뉴 ID), 검증 통과 시 기존 `POST /api/standard-design/requirements`로 행별 저장 |
| 프로젝트 메뉴 Excel | 진입점 버튼만 존재 (미구현) |
| 회사 LLM 호출 | Port/Adapter(`DesignLlmClient`), 단순 프롬프트 API, 표준용어 추천 PoC 구현. 요구사항 분석 전용 API·결과 저장 없음 |
| 요구사항 AI 분석 탭 | placeholder (미구현) |
| SD 설계 대상 프로그램 생성 | 모델·API·UI 없음 (미결정) |

## 2. 검증 상태

- 통과: `npm run build`, `npm run lint`, `npm run backend:test`(30건, 5건 skip).
- **미완료**: 실제 회사 LLM 접속 검증 (`COMPANY_LLM_*` 환경값 없음), 승인된 PostgreSQL 환경 검증, 브라우저에서 실제 Excel 업로드 검수.

## 3. 큰 결정 필요 (구현 보류)

### A. 요구사항 LLM 분석 결과 저장 구조
- 현재 구조: `BSDRATCH.ANALYSIS_STATUS` 컬럼만 있고 분석 결과 모델이 없다.
- 선택지: (1) 무저장 요청-응답, (2) 분석 결과 신규 테이블(`BSDRANL`: 요구사항 ID, 모델, 프롬프트 버전, 결과 JSON, 상태), (3) 요구사항 컬럼에 JSON 추가.
- 추천: (2). 재현성·검수·이력이 필요하고 요구사항 테이블 오염이 없다. 프롬프트·응답 로그에는 원문 비밀정보를 남기지 않는다.

### B. SD 설계 대상 프로그램 모델
- 현재 구조: 설계 대상(화면)은 Lifecycle의 Screen 계약(browser localStorage)에 있고, BaseKit Program 레지스트리(COMMON 소유)와 분리되어 있다.
- 선택지: (1) LLM 결과를 "설계 대상 후보"로 신규 SD 테이블에 저장 후 승인 시 Screen으로 승격, (2) 바로 Screen 생성, (3) Core Program Registry에 직접 등록.
- 추천: (1). 사람 승인 단계를 두고 Core Program 모델과 결합하지 않는다.

위 두 항목은 승인 후 ADR로 확정하고 구현한다.

## 4. COMMON 요청사항

1. 공통 Excel Import가 헤더 누락·비어 있는 선택 컬럼을 허용하는지 확인 요청(현재 SD는 전체 헤더가 필요한 기본 정책 사용).
2. 공통 Excel Import에 `onImport` 부분 실패 결과(성공 N건/실패 행) 표시 지원 검토.
3. Program Registry가 `EXCEL_DOWNLOAD`를 `SD_REQUIREMENT_DESIGN`의 신규 Action으로 인식하도록 DB 동기화 확인.
4. 공통 LLM 호출 정책(타임아웃, 응답 크기, 로깅 마스킹)이 있다면 공유 요청.
5. 승인된 PostgreSQL 검증 환경과 `COMPANY_LLM_*` 주입 방식 안내.

## 5. 디자인팀 요청사항

1. Excel Import 미리보기 모달의 오류 행·긴 텍스트 표시 검수.
2. 요구사항 목록 Toolbar의 `Excel 양식`·`Excel 가져오기` 배치 확인.
3. AI 분석 탭 결과 표시(후보 목록, 승인/반려)와 설계 대상 프로그램 후보 화면 시안.

## 6. 다음 작업

1. A·B 결정 승인 → ADR 작성.
2. 분석 결과 테이블 Flyway, 분석 API(`DesignLlmClient` 재사용), AI 분석 탭 연결.
3. 실제 LLM·DB 환경에서 통합 검증.
4. 프로젝트 메뉴 Excel Import 연결.
5. Excel 재가져오기 중복 방지 정책(현재는 중복 검사 없이 신규 생성) 결정.

## 7. Excel 업로드 마감 (2026-10-05, 이번 범위)

- 범위: 요구사항 Excel 업로드만. LLM 분석·분석 저장·설계 프로그램 생성·프로젝트 메뉴 Excel은 제외.
- 실제 브라우저 검증(Edge headless, local H2 프로필): 양식 다운로드 헤더, 오류 파일(저장 0건), 정상 3건 매핑(메뉴/유형/상태 기본값), 2번째 건 실패 주입 시 1/3 저장 후 중단 안내, 재시도 시 중복 없이 3건, 동일 파일 재업로드 시 중복 확인 후 취소(건수 불변).
- COMMON 적용 여부: COMMON 보완본·인계 문서는 어떤 remote branch에서도 확인되지 않음. SD는 foundation 4e4eb2f만 사용. 공통 코드 수정·복사 없음.
- 제한: 서버 측 멱등성 없음(중복 방지는 클라이언트 한정), roleCode ADMIN 고정으로 실제 권한 거부 동작 미검증, 오류 시 Import 버튼이 비활성화되지 않고 무반응(COMMON/디자인 요청), 미리보기 그리드가 모달 폭에서 2열만 표시(디자인 요청), PostgreSQL 승인 DB 검증 없음.