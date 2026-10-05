# SD 요구사항 분석·프로그램 생성 UX 인계안

작성일: 2026-10-05 · 상태: 화면 설계 초안 / 기존 계약 대조 완료 / SD 합의·실제 구현 검수 대기

## 근거와 소유권

작업지시: `C:/Users/권현수/Documents/Codex/2026-10-05/co/outputs/DESIGN-task.md`.
실제 참고 소스: `G:/CARON/basekit/design`, `G:/CARON/basekit/sd`.
design-work에는 기존 미추적 baseKit/, copilot-worktrees/가 있어 보존했다. 이 인계안은 docs/design/sd-requirement-analysis/에서 GitHub commit 기준으로 관리한다. 제품 소스 코드는 변경하지 않았다.

RequirementIntakePage, requirementApi, ExcelImport/Dialog/Parser/Validation/Types, FormModal, ProjectListDetailWorkspace, README, 현재 상태 문서, Architecture, ADR-021/031을 직접 확인했다. 현재 AI 탭은 실행 없는 골격이다. Requirement CRUD 계약은 존재하지만 요구사항 분석·SD 프로그램 저장 계약은 확인되지 않았다. 오래된 상태 문서의 미구현 표기보다 현재 코드를 우선했다. 원격 PR 상태는 조회하지 않았다.

디자인: 화면·문구·상태·접근성·UX 검수. SD: 매핑, 프로젝트 검증, 분석 API, 구조 검증, 저장·생성, 재조회. COMMON: 공통 Excel/Modal/UI 개선 및 시스템 Program/Runtime/권한. 이 문서의 신규 필드·이벤트는 제안이며 존재하는 API로 간주하지 않는다. 신규 저장 모델·Migration·멱등 정책은 SD에서 결정 절차를 따른다.

## 화면 흐름

제품 기준 4단계: **요구사항 준비 → 분석 → 결과 검토 → 확정·생성**.
Excel Preview·오류 확인·명시적 반영과 분석 대상·의견 입력은 요구사항 준비에 속한다. 분석 단계는 INPUT_READY / ANALYZING / ANALYSIS_FAILED / REVIEW_READY의 내부 상태를 표시하며, 진행·실패를 별도 Wizard 단계로 만들지 않는다. 확정·생성 단계 안에서 검토 확정과 생성 확인·결과를 순서대로 처리한다. 앞 단계로 이동해도 결과를 자동 삭제하지 않는다.

프로젝트 선택 → Excel Preview/오류 확인 → 명시적 요구사항 반영 → 저장된 요구사항 선택·의견 입력 → 실제 LLM 분석 → 결과 수정·선택 → 확정 → 생성 확인 → SD 프로그램 생성·재조회.

Excel 없이 기존 요구사항부터 시작할 수 있다. 단계는 작업 안내이며 앞 단계로 돌아갈 수 있다. 입력 변경 시 이전 결과는 보존하되 ‘STALE · 이전 입력 기준 결과’로 표시하고 후보 선택·편집·확정·생성을 차단한다. LLM 성공은 확정이나 생성으로 이어지지 않는다.

## 화면안

### A. Excel Preview 모달

기존 요구사항 PageHeader의 ‘Excel 템플릿’, ‘Excel 가져오기’에서 진입한다. 프로젝트 이름을 고정 표시한다.

상단: 템플릿 안내 ‘첫 Sheet의 첫 행을 Header로 읽습니다. 오류를 수정한 파일을 다시 선택하세요.’ → 파일 선택 → 파일명·Sheet 안내 → 총 데이터 행/정상 행/오류 행/헤더 오류 각각 표시.
중앙: DataTable [Excel 행, 상태, 요구사항명, 유형, 요구사항 설명, 프로세스 설명, 오류내용]. 긴 내용은 상세 펼침으로 확인한다. Header 오류는 표 위에서 별도 안내한다.
하단: 취소 / ‘요구사항 N건 반영’. Header·행 오류 0, 정상 행 1개 이상, 서버 중복 검사 완료, parsing/importing 아님일 때 활성화한다. 오류 행만 제외하고 반영하는 기능은 이번 안에 없다.

컬럼 제안: 요구사항명→REQUIREMENT_NAME(필수), 유형→REQUIREMENT_TYPE_CODE(필수, 활성 공통코드), 요구사항 설명→DESCRIPTION(필수 여부 SD 합의), 프로세스 설명→PROCESS_DESCRIPTION(선택). PROJECT_ID는 현재 Context에서 부여한다. REQUIREMENT_ID는 서버 발급, STATUS는 서버 허용 기본값, 메뉴 관계는 별도 편집. Excel의 프로젝트/ID/메뉴 이름을 임의 자동 매칭하지 않는다. 알 수 없는 Header는 기존 기본 정책대로 오류 처리한다.

유형 길이·텍스트 길이·최대 파일/행 수는 서버 및 COMMON 정책을 전달받아 화면과 일치시킨다. 이름 동일은 중복 확정 근거가 아니다. 가져오기 batch/source 식별이 없는 현재 CRUD로 재시도를 안전하다고 보장하지 않는다. SD가 중복 정책을 확정하기 전 일괄 생성 완료 표시 금지. 부분 저장은 행별 성공 ID와 실패 원인을 표시하고 실패 건만 재시도하며, 이를 지원하지 못하면 전체 원자적 반영 계약을 먼저 확정한다.

### B. 분석 대상·설계 의견

PageHeader: 요구사항 분석 / 프로젝트 Context / 선택 N건. 기존 ProjectListDetailWorkspace를 사용한다.
좌측: 검색, 전체 선택(현재 필터 범위 명시), BaseKitDataGrid 체크박스 [이름, 유형, 상태]. 필터 밖 선택도 총 N건에 포함하며 ‘선택 목록 보기’로 확인·해제한다. 행 클릭은 상세 이동, 체크는 분석 대상 선택이다.
우측 BaseTabs: ‘분석 입력’ / ‘분석 결과’. 분석 입력은 선택 요구사항의 원문(읽기 전용)과 개별 설계자 의견, 종합 의견, 전송 요약을 배치한다. 원문 수정은 기존 요구사항 상세에서 저장 후 돌아온다. 미저장 신규 요구사항은 선택할 수 없다. 변경이력 선택은 기능 확인 전 표시하지 않는다.
하단: ‘실제 LLM 분석’. 선택 1건 이상, 입력 유효, 실행 중 아님, 사용 권한·연결 설정 확인 조건. 첨부 본문/OCR는 현재 미지원이며 전송 요약에 ‘저장된 요구사항 본문과 의견만 전송’이라고 명시한다.

### C. 분석 단계 내부 상태: 준비·진행·실패·완료

요청 후 상태 영역에 ‘회사 LLM에서 분석 중입니다. 입력은 보존됩니다.’와 경과 시간을 표시한다. 실제 진행률 계약이 없으므로 퍼센트나 가짜 단계 진행률을 표시하지 않는다. 실행 중 선택·의견 변경과 중복 실행을 막는다. 타임아웃 값은 서버 계약을 따른다.
실패는 동일 입력을 유지하며 ‘다시 분석’ 버튼을 제공한다. 연결 미설정/권한 없음/시간 초과/빈 응답/구조 오류를 구분한다. 원문 예외·키·URL을 표시하지 않고 문의용 REQUEST_ID만 제공한다. 불명확한 실행 상태에서는 상태 조회 후 재실행한다. 서버 취소 계약이 없는 동안 ‘분석 취소’ 버튼을 표시하지 않는다.

### D. 결과 검토·수정·확정

좌측은 선택된 요구사항과 출처, 우측은 결과 Workspace로 확장한다. BaseTabs: 요약 / 업무메뉴·역할·액션 / 프로세스 / Layout 추천 / SD 프로그램 후보. 프로토타입에서 다섯 영역을 각각 실제 탭으로 전환한다. 요약은 출처·입력 버전, 업무구조는 메뉴/역할/주요 액션 표, 프로세스는 단계/역할/조건 관계, Layout은 목록·상세 배치와 공통 컴포넌트 추천, 후보는 선택 Grid·원본·편집본·출처로 표현한다. 전체 흐름은 ‘요구사항 → LLM 분석 → 업무구조/프로세스/Layout → SD 프로그램 후보 → 사용자 선택·확정 → 생성’으로 표시한다. 프로세스는 구조화 단계·관계 목록으로도 읽을 수 있게 한다.
후보 Grid: 선택, 이름, 목적, 관련 요구사항, 검토 상태. 행 상세에서 메뉴 추천·역할·액션·프로세스·Layout을 수정한다. LLM 원본과 사용자 편집본을 구분하고 ‘원본 보기’를 제공한다. 기본 생성 선택은 0건이며 사용자가 선택한다. 낮은 확신 수치는 응답 계약이 없으면 만들지 않는다.
검증: 필수 이름·목적·출처, 같은 프로젝트의 유효한 요구사항 참조, 후보 중복, 끊어진 프로세스 관계, 서버 제약. 오류는 필드 옆과 요약에 함께 표시한다.
‘선택 N건 확정’은 유효한 편집본·현재 입력 버전일 때만 활성화. 확정 후 ‘검토 확정’ 배지를 표시한다. 결과 재수정 시 확정을 해제하고 다시 확정한다. 서버 확정 저장이 없다면 영구 확정처럼 표시하지 않는다.

### E. 생성 확인·완료

FormModal: ‘SD 설계 프로그램 생성’ / 프로젝트 / 확정된 후보 N건 / 수정·출처 요약 / ‘시스템 관리 Program·Runtime·권한에는 등록되지 않습니다.’ 안내 / 돌아가기 / ‘N건 생성’.
생성 중 프로젝트 변경·중복 클릭을 차단한다. 서버 응답 확인 후 목록을 재조회하고 [후보명, 결과, SD 프로그램 ID, 오류]를 표시한다. 성공 ID로 ‘프로그램 열기’를 제공한다. 실패는 성공을 유지하며 실패 건만 재시도한다. 결과 불명 시 먼저 생성 상태 조회를 제공하며 새로운 키로 전체 재생성하지 않는다. 생성 완료된 후보는 다시 선택하지 못하게 한다.

## 공통 컴포넌트 매핑

| 영역 | 재사용 | 소유권/제약 |
|---|---|---|
| 헤더·프로젝트 | PageHeader, ProjectContextSelector | SD Context 사용 |
| 목록·상세 | ProjectListDetailWorkspace | 기존 splitter/접기/확장 유지 |
| 요구사항·후보 | BaseKitDataGrid, 기존 Metadata/FieldDefinition | 신규 업무 필드 정의는 SD |
| Excel | ExcelImport, ExcelImportDialog, DataTable | columns/validateRow/mapRow/onImport 재사용 |
| 결과 | BaseTabs, 기존 폼 토큰 | 단계 안내는 SD 내부 조합, 새 UI 라이브러리 불필요 |
| 확정·생성 확인 | FormModal | submitDisabled, focus 보완 COMMON 요청 |
| 행동·피드백 | ActionButton, BaseKitMessage | 기존 Action/권한 계약에 매핑; 새 Action 코드는 임의 등록 금지 |

## 데이터·상태 계약 초안

현재 Requirement 필드: REQUIREMENT_ID, PROJECT_ID, REQUIREMENT_NAME, REQUIREMENT_TYPE_CODE, DESCRIPTION, PROCESS_DESCRIPTION, STATUS, MOD_DT, MENU_KEYS, PROJECT_MENU_IDS, ATTACHMENTS. 기존 requirementApi 응답은 DATA envelope를 읽는다. 현재 STATUS는 요구사항 업무 상태이며 아래 분석 상태로 덮어쓰지 않는다.

신규 계약은 SCREAMING_SNAKE_CASE. UI 상태 변수·props만 camelCase. 경로와 영속 모델은 SD가 확정한다.

| 경계 | 요청 제안 | 응답 제안/검증 |
|---|---|---|
| Excel 반영 | PROJECT_ID, IMPORT_REQUEST_ID, SOURCE_ROWS[{SOURCE_ROW_NUMBER, …RequirementInput}] | IMPORT_ID, ITEMS[{SOURCE_ROW_NUMBER, STATUS, REQUIREMENT_ID?, FIELD_ERRORS?}], 전체 성공/부분 성공 정책 |
| 분석 실행 | PROJECT_ID, REQUEST_ID, INPUT_VERSION, REQUIREMENTS[{REQUIREMENT_ID, MOD_DT, DESIGN_OPINION}], OVERALL_OPINION | ANALYSIS_ID, STATUS, INPUT_VERSION, RESULT_VERSION, RESULT?, FIELD_ERRORS? |
| 분석 조회 | PROJECT_ID, ANALYSIS_ID | 동일 상태·결과; 새 요청과 늦은 응답 구분 |
| 편집·확정 | ANALYSIS_ID, INPUT_VERSION, RESULT_VERSION, EDITED_RESULT, SELECTED_CANDIDATE_IDS | CONFIRMATION_ID, CONFIRMED_RESULT_VERSION; 낙관적 충돌 검증 |
| 생성 | PROJECT_ID, CONFIRMATION_ID, CONFIRMED_RESULT_VERSION, GENERATION_REQUEST_ID, CANDIDATE_IDS | GENERATION_ID, ITEMS[{CANDIDATE_ID, STATUS, SD_PROGRAM_ID?, ERROR_CODE?, MESSAGE?}] |
| 재진입/불명 결과 | PROJECT_ID, ANALYSIS_ID 또는 GENERATION_ID | 저장된 입력/결과/확정/생성 목록과 버전 |

분석 결과 제안: SUMMARY, BUSINESS_MENUS[], ROLES[], ACTIONS[], PROCESS_STEPS[], PROCESS_EDGES[], LAYOUT_RECOMMENDATIONS[], PROGRAM_CANDIDATES[]. 각 후보는 CANDIDATE_ID, PROGRAM_NAME, PURPOSE, SOURCE_REQUIREMENT_IDS[], 관련 결과 참조를 가진다. SD가 구조·필수값·길이·참조 검증 후 화면에 전달한다. LLM의 문자열 JSON을 UI가 직접 신뢰하거나 실행하지 않는다. 출력은 안전한 텍스트로 렌더링한다.

입력 버전은 요구사항 선택·MOD_DT·개별 의견·종합 의견에서 계산하거나 서버가 발급한다. 서버는 요청 ID에 연결된 원문 스냅샷을 검증/보관하는 방안을 확정해야 한다. 응답 수용 조건은 projectId + analysisId/requestId + inputVersion 모두 일치. 버전이 다르면 결과를 현재 화면에 자동 덮어쓰지 않는다. MOD_DT의 충돌 검증 적합성은 SD 확인 필요.

| 상태 | 주요 행동 | 다음 상태/차단 |
|---|---|---|
| EMPTY / PARSING | 파일 선택 | PREVIEW_VALID / PREVIEW_INVALID / FILE_FAILED; 파싱 중 반영 차단 |
| PREVIEW_VALID | 명시적 반영 | IMPORTING → IMPORTED / IMPORT_FAILED / IMPORT_UNKNOWN |
| INPUT_READY | 실제 분석 | ANALYZING; 선택·의견 편집 잠금 |
| ANALYZING | 응답 수신·조회 | REVIEW_READY / ANALYSIS_FAILED / ANALYSIS_UNKNOWN |
| REVIEW_READY | 편집·선택·확정 | CONFIRMING → CONFIRMED / 실패; 수정하면 이전 확정 무효 |
| STALE | 선택 요구사항·원문 버전·개별/종합 의견 변경 | 결과/원본/편집본 보존; 후보 선택·편집·확정·생성 차단, 다시 분석이 주요 행동 |
| CONFIRMED | 생성 확인 | GENERATING; 버전 재검증 |
| GENERATING | 응답·재조회 | GENERATED / PARTIAL / GENERATION_FAILED / GENERATION_UNKNOWN |
| PARTIAL / UNKNOWN | 상태 조회 후 실패 건 재시도 | 기존 성공 ID 유지; 같은 멱등 키 계약 준수 |

프로젝트 전환: 입력·결과 수정이 있으면 ‘현재 작업을 유지하고 돌아가기 / 변경을 버리고 전환’ 확인. 실행 중에는 전환을 막으며 요청 종료·상태 조회 후 가능하다. 전환 완료 시 선택·의견·후보·메시지·확정 초기화. 서버 저장을 지원하면 해당 프로젝트 작업 재조회로 복원한다. 새로고침 복구는 저장 계약 확정 전 미지원으로 표시한다.

## STALE와 재분석

분석 결과가 있는 상태에서 선택 요구사항 집합, 선택 원문의 버전, 선택 요구사항의 개별 의견 또는 종합 의견이 바뀌면 입력 버전을 갱신하고 확정을 해제한다. 기존 분석 결과·출처 스냅샷·사용자 편집 내용·생성 성공 ID는 보존한다. 이전 후보 선택은 해제하고 후보 선택·편집·확정·생성을 비활성화한다. 생성 완료 ID는 재분석 이후에도 재생성 대상에서 제외한다.

안내 문구: ‘요구사항 또는 설계 의견이 변경되었습니다. 현재 분석 결과는 이전 입력 기준입니다. 다시 분석한 후 확정할 수 있습니다.’

‘다시 분석’은 현재 입력으로 분석 단계의 ANALYZING 상태로 진입한다. 완료 응답 수용 조건이 일치하고 구조 검증을 통과하면 새 결과로 교체하며 기본 후보 선택 0건·미확정으로 시작한다. 실패하면 이전 결과는 계속 STALE로 보존하고 현재 입력도 유지한다. 입력 값을 원래 값으로 되돌렸다는 이유만으로 확정을 자동 복구하지 않는다. 영속 이력·새 결과와 기존 편집본 병합은 SD 미결정 범위이며 프로토타입은 메모리 내 현재 결과만 유지한다.

후보 편집은 분석 입력 변경과 구분한다. 입력 스냅샷은 유지하고 RESULT_VERSION에 대한 확정만 해제하며, 유효한 편집본을 다시 확정하도록 한다. 신규 서버 계약이나 저장 모델을 이 보완으로 확정하지 않는다.

## 오류 문구

| 원인 | 문구/행동 |
|---|---|
| Header 오류 | ‘필수 열 ‘요구사항명’이 없습니다. 템플릿과 열 제목을 확인하세요.’ / 다시 선택 |
| 행 오류 | ‘Excel 7행: 유형이 유효하지 않습니다.’ / 해당 행 확인 |
| 연결 미설정 | ‘회사 LLM 연결이 설정되지 않았습니다. 관리자에게 문의하세요.’ |
| 시간 초과 | ‘분석 응답을 확인하지 못했습니다. 실행 상태를 확인한 뒤 다시 시도하세요.’ |
| 빈 결과/구조 오류 | ‘검토 가능한 분석 결과를 받지 못했습니다. 입력을 유지했습니다.’ / 다시 분석 |
| 입력 변경 | ‘분석 후 입력이 변경되었습니다. 다시 분석해야 확정할 수 있습니다.’ |
| 생성 일부 실패 | ‘3건 중 2건 생성, 1건 실패했습니다. 실패 항목을 확인하세요.’ |
| 생성 상태 불명 | ‘생성 결과를 확인 중입니다. 상태 확인 후 재시도할 수 있습니다.’ |

## 좁은 화면·접근성·긴 결과

Workspace 최소 폭을 유지할 수 없으면 기존 LIST/DETAIL/DETAIL_EXPANDED 방식으로 목록·상세를 전환한다. 320px에서 외곽 가로 스크롤 없이 버튼 줄바꿈, 표에만 가로 스크롤을 허용한다. Preview 모달은 화면 안 최대 높이와 본문 스크롤, 하단 행동 영역을 유지한다. 큰 결과는 탭별 목록·행 상세로 읽고 텍스트 전체 보기/줄바꿈을 제공한다.

체크박스는 요구사항명을 accessible name에 포함한다. Tab으로 모든 조작 가능, Space로 선택, 기존 splitter 방향키 계약 유지. 모달은 focus 진입·trap·복귀, 고유 aria-labelledby, Escape/배경 클릭의 제출 중 차단을 COMMON에서 보완한다. 결과 도착은 aria-live polite, 중요한 실패는 alert, 오류 요약에서 필드로 이동. 색상 외 ‘정상/오류/확정/생성됨’ 텍스트를 제공한다. 단계 이동 후 제목에 focus. 접근성 완료는 실제 구현에서 검수한다.

## SD 합의가 필요한 사항

1. 요구사항 분석 API·구조화 응답·회사 LLM 실제 연결 결과.
2. Excel 컬럼/중복/부분 저장·재시도 계약, 제한값과 활성 코드.
3. SD 설계 프로그램 기존 모델과 생성·조회 경로, 저장·확정 경계. 시스템 Program 모델로 대체하지 않는다.
4. 버전·멱등·상태 조회·재진입 지원 여부와 실제 Action/권한 매핑.
5. UI 코드 파일 소유권: RequirementIntakePage와 업무 API는 SD, 공통 UI는 COMMON. 디자인은 현 단계 코드 적용 없음.

## 전달 및 검수 상태

COMMON 요청은 `COMMON-UX-requests.md`, 검수표는 `UX-review.md`, 화면안은 `SD-UX-wireframes.html` 참조. 화면안은 4단계 전환·분석 내부 상태·STALE/재분석·결과 탭·후보 선택/편집·확정/생성 차단을 확인하는 상호작용 프로토타입이다. 응답 상태 제어와 생성은 예시이며 실제 회사 LLM/API와 연결되지 않았다. 디자인 완료와 실제 제품 구현 완료를 구분한다. SD 계약 회신 전 ‘합의 완료’로 표시하지 않는다.

SD 채팅은 초안 인계를 수신했으나 자료 직접 검수·계약 확정은 아직 하지 않았다고 회신했다. 현재 상태는 합의 대기다. Excel 성공 후 닫힘은 비동기 closure 때문에 실제 차단 여부를 재현해야 하며 확정 결함으로 취급하지 않는다.

## 2차 보완 기준과 범위

작업지시 SHA: 19775208e7e180ba8b594c21a8121481e08ecc82, 문서: DESIGN-next-task.md. 기존 1차 기준은 780921c2e3c6090bb8597eb6aea0741878952cdb다. 수정한 프로토타입·인계·검수 자료는 완료 commit SHA로 함께 검토한다.

COMMON-UX-requests.md는 변경하지 않았다. 이번 보완은 기존 BaseTabs와 상태·메시지 조합으로 구현 가능하며 신규 공통 컴포넌트 요청은 없다. 기존 요청은 회신/반영 판정과 별개로 유지한다. 프로토타입의 native 요소는 화면 검토용이며 실제 SD 구현은 기존 공통 컴포넌트로 적용한다. API·영속 모델·Action Code 확정, 실제 Excel/LLM/DB 연동과 제품 UX 검수는 여전히 대기다.

2차 프로토타입 검증: P01~P09 브라우저 시나리오 통과, Desktop/Mobile 캡처 확인. 상세 판정은 UX-review.md의 2차 프로토타입 검수 참조. 실제 제품 연동·공통 컴포넌트 적용 검수와 구분한다.
