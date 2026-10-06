# BaseKit 현재 상태와 WBS

이 문서는 새 작업자와 GPT Work가 실제 Repository 상태를 빠르게 파악하기 위한 기준 문서다. 특정 날짜나 과거 작업 branch가 아니라 최신 `dev-pm`과 열린 PR을 기준으로 갱신한다.

## 프로그램관리 검색 영역 및 Grid 팝업 보완 (2026-10-05)

원격 dev-pm a93c72c에서 시작했고 작업 중 추가된 최신 dev-pm 0458826 및 design-work 47e8f9a를 충돌 없이 반영했다. UI 6d486b9/42565a4. 최신 공통 FormSelect를 Grid에서도 재사용한다. 기존 프로그램관리 및 폼 변경 보존.

- 공통 MasterDetailMultiGrid 옵션 행에 실제 좌우 검색 영역을 배치했다. 좌측은 조건 없이 빈 검색 영역이며 두 컨테이너가 동일 부모 Grid track 높이를 공유한다. 검색 패널과 같은 border/background/radius/padding을 사용한다. 좌측 패널 내부 spacer나 임의 margin으로 정렬하지 않는다. 우측에는 표시 범위/추가 권한만 유지한다.
- opt-in 상시 MetadataSelect를 body portal popup으로 확장했다. 흰 불투명 배경, 1px border, shadow, 6px gap, 4px padding, blue selected/check, gray hover. 위/아래 공간과 화면 폭을 고려하며 외부 클릭/스크롤/resize/blur로 닫는다. 방향키/Enter/Escape/Home/End와 Grid 이벤트를 분리하고 Tab은 기본 이동을 유지한다. disabled 및 미등록 현재값 보존, 옵션 검증/저장/API/권한 의미 유지. 다른 일반 SELECT/editor는 변경하지 않는다.
- Chrome API fixture 1920/1440/1280 × ICON_TEXT/ICON_ONLY 6조합 통과: 검색 영역 상단/하단 차이 0px, 제목/헤더 차이 0px, splitter 조절 및 옵션 wrap 후 동일 높이/헤더 정렬. Module/유형 한 클릭 팝업, body portal/불투명/border/shadow, selected/check/hover, 방향키/Enter/Escape/마우스 선택과 행선택 유지 확인. JS 오류 및 실제 API 쓰기 0. 실제 DB 저장은 검증하지 않았다.
- build/lint/frontend 53건, 공통 Grid adapter, backend 46건(실패 0, 외부 PostgreSQL 조건 5건 skip), diff check 통과. 기존 번들 크기 경고만 유지.
- 제품 반영은 UI 파일 7개만 별도 통합 브랜치에 cherry-pick한다. DESIGN 기록은 design-work에 유지한다. COMMON 추가 차단 협의 없음. 영향은 detailOptions를 사용하는 정렬 레이아웃과 gridControlDisplay always SELECT로 제한한다.
## 프로그램관리 상시 콤보 / 공통 옵션 행 (2026-10-05)

최신 원격 dev-pm `62ffb796fecd77c480dce0b52425edd817846b8a`에서 독립 작업 브랜치로 UI를 수정했다. 기존 design-work의 통합 이력이나 로컬 dev-pm ahead 커밋은 제품 반영에 포함하지 않는다.

- 문제: SELECT는 평상시 label, 편집 진입 후 agSelectCellEditor였으며 Endpoint 옵션은 제목 아래 Toolbar 내부에 있었다. 좁은 패널에서 공통 Toolbar 버튼이 잘렸다.
- FieldDefinition의 선택적 `gridControlDisplay: 'always'`와 공통 MetadataSelect를 추가하고 Module/유형만 명시적으로 적용했다. 기존 options/검증/isEditable/editPolicy/DELETED/row state/저장·취소/API 의미를 유지한다. 미등록 현재값은 그대로 보이되 새 선택값으로 허용하지 않는다. 다른 SELECT는 기존 표시 방식을 유지한다.
- 콤보 mouse/pointer/double-click 및 비 Tab 키를 Grid 처리에서 분리한다. 행 갱신은 셀 refresh로 수행하고 rowClassRules가 변경 표시를 제거하여 저장·취소 뒤 NORMAL 표현을 복원한다.
- MasterDetailMultiGrid의 detailOptions 공통 행은 오른쪽 패널 열에 위치하며 양쪽 공통 header 위에서 높이를 함께 관리한다. subgrid가 title/Grid header를 정렬한다. Toolbar 버튼은 필요하면 공통 wrap 규칙으로 줄바꿈한다. absolute/음수 margin/왼쪽 패널 빈 spacer는 추가하지 않는다.
- 최신 dev-pm 기준 build/lint/frontend 50건, design-work build/lint/frontend 53건, Backend 총 42건(실패 0, 조건부 제외 5건), diff check 통과. Chrome 1920/1440/1280 × ICON_TEXT/ICON_ONLY 6조합에서 초기 콤보, 변경 표시/취소/fixture PUT 저장, 32px 행, 20px Badge, 28px 옵션, UNMAPPED 15건, 좌우 title/header 차이 0px, 폭·높이 splitter 조절, 패널 버튼 경계 및 페이지 overflow를 확인했다. 공통 Grid 별도 fixture에서 readonly/DELETED disabled 및 방향키 변경 확인. 브라우저는 API fixture로 실제 DB 저장은 미검증이다.
- COMMON 추가 협의: 차단 사항 없음. 이번 사용자 승인 범위에서 최소 공통 표현 계약 확장을 함께 구현했다. opt-in SELECT와 detailOptions를 다른 화면에서 사용할 때 같은 규격을 따른다. API/DB/권한 변경 없음.

## Form LEFT/TOP 및 Required dot 표준 (2026-10-05)

최신 원격 dev-pm 0f14086 기준으로 공통 FormField, FieldDefinition.labelPosition, MetadataForm textarea/오류 표현과 요구사항 화면을 수정했다. 짧은 필드 LEFT, 긴 입력 TOP을 혼합하며 560px 이하 Form 패널은 TOP 전환한다. 5px CSS pseudo-element dot와 실제 required/aria-required를 유지하고 error border/background/message를 분리했다. API/DB/권한/업무 검증 의미 변경 없음. build/lint 및 Frontend 53건 통과, Backend 46건 실패 0·조건부 제외 5건. 실제 요구사항 화면 1280/1440/1920, 공통 fixture 480px·긴 label·textarea·error 검수 완료. Shell 기존 최소 1280px는 유지한다. COMMON 추가 차단 협의 없음. 제품 반영에는 UI 변경 커밋만 선택하고 DESIGN 문서는 design-work에 유지한다. 상세는 docs/design/form-layout-required/DESIGN-form-layout-required-task.md 10절을 따른다.

## DESIGN 요구사항 그룹 UX 재설계 (2026-10-06)

제품 SoT dev-pm `d1124d11bb636f466abffa65c9f29cad00ecebe3`, 작업지시 `3825aebbb054d53a1d913bdd278c37c85c5ad512` 기준으로 그룹 UX/Prototype을 재설계했다. [UX 설계](design/sd-requirement-group/UX-design.md), [SD 구현 인계](design/sd-requirement-group/SD-implementation-handoff.md), [검증](design/sd-requirement-group/verification.md). 직접 추가/여러 독립 Analysis 누적·비교/근거/재검토 Gate/Requirement 상세/미저장·예외를 정의하고 Prototype 브라우저 83건 통과, runtime 오류 0건. 제품/API/DB/LLM 변경은 없고 그룹 기능은 여전히 제품 미구현이다. 저장·독립 추천 Analysis·검토 기준 등 신규 업무 계약은 미결정이며 SD 확정 후 구현한다. 내부 산출물은 design-work에 유지, dev-pm 전체 merge/제품 반영 대상 없음. 제품 구현 완료 기록과 구분한다.

## 1. 프로젝트 단계

BaseKit은 Frontend Prototype을 기반으로 Spring REST와 실제 DB Foundation을 함께 확장하는 Full Stack 단계다. Admin Shell과 공통 관리 화면 패턴을 유지하면서 시스템 공통 V1의 API·DB 계약을 구체화한다.

목표는 여러 SI 프로젝트에서 반복 사용할 수 있는 다음 기반이다.

- 표준 Architecture
- 공통 Infrastructure/Business Foundation
- 개발 생산성 기준
- 코드와 문서가 함께 유지되는 작업 방식

현재는 **Level 1: 시스템 공통 Foundation** 단계다. 초급 개발자도 가이드와 규약을 따르면 일관된 화면과 코드를 만들 수 있고, 개발자 변경에도 프로젝트 스타일이 흔들리지 않는 기반을 목표로 한다.

## 2026-10-05 최종 dev-pm 통합 및 실행 검수 완료

사용자 승인으로 COMMON(`a928069`), DESIGN(`f2d156e`), SD(`7233375`)의 최종 작업을 dev-pm에 통합했다. 제품 통합 커밋은 `15c3805`이며, 오늘 종결 범위에는 DESIGN 문서·검수 기록도 포함한다. 기존 COMMON과 DESIGN 제품 UI 변경은 보존했다. 이전 Copilot 작업 트리의 Excel 구현은 현행 SD와 동일하여 재적용하지 않았고, 해당 미커밋 파일과 복구용 stash는 보존했다.

요구사항 목록 내용 컬럼 제거, 요구사항명 전체폭, 요구유형·상태 동일 행, 기본정보 설계 의견, AI 분석 탭 제거/구현 KEEP을 5173 실제 화면에서 확인했다. dev-pm 백엔드를 clean 재빌드·재실행하여 8080 health UP, PostgreSQL 기존 V11 및 11개 migration 검증, 요구사항 10건 조회와 DESIGN_OPINION 응답을 확인했다. 실데이터 수정·삭제는 수행하지 않았다.

통합본 build/lint, Frontend 회귀 53건, Backend H2 46건(41건 통과·외부 PostgreSQL 조건 5건 skip), git diff --check 통과. 브라우저 console error 0. 검수 주소: `http://localhost:5173/baseKit/#/standard-design/requirements`. 상세 범위와 남은 미검증 사항은 [오늘 작업 종결 보고](releases/2026-10-05-dev-pm-closeout.md)를 따른다. remote push와 main 승격은 수행하지 않았다. 아래 개별 작업 기록은 당시 검증 이력이다.

## DESIGN Grid editable 기본 테두리 회귀 복원 (2026-10-05)

공통 CSS의 1292264 변경이 resting editable cell 테두리를 1px에서 0으로 제거한 원인이다. 기존 공통 inset box 테두리를 복원하고 inline text/number/select editor의 border/background/padding 및 disabled/read-only 색상을 공통 토큰으로 보완했다. Batch 배경, row/header 크기, selection/focus, API/DB/권한 계약은 유지한다. 제품 반영은 CSS 커밋 500eb84만 cherry-pick하며 이 기록은 DESIGN에 유지한다.

최신 로컬 dev-pm 통합본 5447cab을 보존하여 design-work를 현행화했다. 원격 dev-pm은 fetch 시 7ef190c으로 되돌아간 상태였다. 원격에는 CSS 한 커밋 62ffb79만 fast-forward push했다. 원래 로컬 dev-pm은 기존 통합 이력을 보존하여 836d991으로 병합했고 원격보다 8커밋 ahead인 clean 상태다. 추가 통합 이력의 원격 게시가 자동 승인 검토에서 범위 위험으로 거절되어 게시하지 않았다.

검증: build/lint, frontend 53/53, backend 46건 실패 0·조건부 제외 5. Chrome API fixture 검수: 공통코드 default 1px/hover/focus 2px, text editor border 1px·white background·좌우 padding 6px, read-only ID 편집 불가, 행 32px. 프로그램관리 1920/1440/1280 × 버튼 2모드에서 Badge 20px·Select 28px·헤더 정렬 차이 0px. 실제 DB 저장 검증은 이번 CSS 범위에서 수행하지 않았다. COMMON 옵션 슬롯/toolbarLayout/alignDetailToolbars 및 subgrid 지원 검토는 기존 협의사항으로 유지하며 신규 공개 API 변경은 없다. SD 추가 협의 없음.
## DESIGN 선택 반영 운영 및 Endpoint 정렬 완료 (2026-10-05)

기준 dev-pm b28dc96 → design-work 현행화. 사용자 승인한 최소 공통 옵션 슬롯·공유 Detail Toolbar track으로 Endpoint Select를 Toolbar에 통합했다. Chrome 6조합에서 header 차이 0px, 빈 목록·너비 변경 유지, build/lint 및 Backend 42건(5 skip) 통과. 기능/API/DB/권한 의미 변경 없음. 제품 UI 파일 4개만 dev-pm에 cherry-pick하며 이번 문서/검수 스크립트/측정은 DESIGN 내부 산출물로 design-work에 유지한다. 아래 이전 작업 기록은 과거 이력이다.

## DESIGN 역할 정정 및 프로그램관리 UI 보정 (2026-10-05)

최신 dev-pm a928069를 포함한 design-work에서 DESIGN 문서를 재검토하고 실제 UI 표현 수정 책임을 명시했다. [역할 기준](design/DESIGN-role.md), [검토 결과](design/grid-status-type-badge/DESIGN-grid-badge-review.md). 상태 compact semantic Badge, 유형 neutral label, 공통 Toolbar Select 스타일 및 긴 Title/Action 표현 보정은 직접 적용했다. API/DB/권한/업무 매핑은 유지했다.

Chrome 실제 제품/fixture 검수: 1920/1440/1280 × 두 버튼 모드, row/header 32/34px·Badge 20px·Select 28px, JS 오류 0. Endpoint 옵션은 아직 Toolbar 밖이며 좌우 header 차이 36px로 미통과. [COMMON 옵션 삽입 계약 요청](design/grid-status-type-badge/COMMON-Endpoint-toolbar-request.md)을 분리했고, 공통 확장 후 DESIGN이 배치와 재검수를 마무리해야 한다. Endpoint 보정 전체 완료 판정은 보류한다. 사용자가 잔여 항목을 인지한 상태에서 design-work push 및 dev-pm merge를 승인했으며, 이번 UI 보정과 문서를 통합한다. COMMON 확장과 DESIGN 재검수는 후속 작업으로 유지한다. build/lint/Backend test(42건, 실패 0·외부 PostgreSQL 조건 5건 skip) 통과.

## 2. 코드까지 구현 완료
- Flyway V9 리소스 충돌 로컬 수정 (2026-10-05): Maven은 `backend/src/main/resources`와 `database/migration`을 모두 classpath에 복사한다. 공유 디렉터리의 `V9__create_sd_analysis.sql`은 backend의 V10과 동일한 SQL이므로 해당 구버전 파일만 Maven 복사 대상에서 제외했다. 기존 SQL/적용 이력을 수정하지 않았으며, 로컬 PostgreSQL에서 기존 V9 검증 후 V10 신규 적용, `mvnw.cmd clean spring-boot:run` 및 8080 health `UP` 확인. Frontend build/lint, Backend test 42건(실패 0, 오류 0, 외부 PostgreSQL 조건 5건 skip), `git diff --check` 통과. 작업 브랜치 `fix/flyway-v9-resource-collision`; 사용자의 기존 V9→V10 파일 변경과 함께 유지해야 한다.

- COMMON-002 (`common-work`): Program 표준 Grid 60:40 / 40:60 resizable Master/Detail, Program별 버튼 권한 그룹 DB 저장, Spring MVC Endpoint 자동수집·ACTIVE/STALE 상태, 다대다 Program 연결과 UNMAPPED 조회. 서버 권한 정책과 Host 인증 Provider 연결 계약 및 HTTP interceptor 검증 구현. 기본 실행에는 인증 Provider가 없으므로 운영 사용자 권한 집행 연결은 미완료다. Menu/Role/SD 확장은 제외. Frontend build/lint 통과, Backend 34건 중 29건 통과·외부 PostgreSQL 조건 5건 skip, 브라우저 1440×900·1280×800 검증. [ADR-033](decisions/033-program-endpoint-button-groups.md) · [RESULT](tasks/common/COMMON-002-RESULT.md)
- Worktree 공통 실행 프로필: Spring dev-pm/common/design/sd와 Vite mode로 5173~5176 / 8080~8083 고정 포트 제공. DB 설정과 API proxy 경로 유지. 실행 명령은 README의 Worktree 실행 프로필 참고.

- Standard Design Requirement Intake V1: Backend canonical Requirement·Menu 관계·Attachment (Flyway V5), 명시적 LocalStorage 이관, Project List-Detail 재사용, 복수 메뉴·파일·이미지 Preview. 프로젝트/메뉴 원본은 기존 구조와 논리 참조하며 OCR/LLM은 미구현. [ADR-031](decisions/031-requirement-intake-backend-boundary.md)
- 공통 `BaseFileUpload` V1: native input/drag & drop, 다중 파일, 정책 기반 사전검증, 파일별 진행률·취소·재시도·삭제, bounded concurrency와 XHR multipart transport. Requirement Attachment에 첫 적용. [ADR-032](decisions/032-base-file-upload-component.md) · [인계 보고서](base-file-upload-v1-handoff.md)
- Standard Design Project Menu V1: 프로젝트별 LEVEL/SINGLE 분류 방식, Project Menu CRUD REST/Flyway V7, Requirement의 별도 Project Menu 관계(BSDRRPML), 기존 시스템 MENU_KEYS 보존, Excel 진입점만 제공. 재귀 트리·Parser·AI 기능은 미구현.

- Standard Design Requirement Excel Import (2026-10-05, dev-pm 통합 완료): 공통 Excel Import를 재사용한 요구사항 양식·검증·저장 연결. 분석 V1은 별도 구현 후 KEEP하며 후속 그룹 분석에서 재사용한다. 기존 [Excel 인계 문서](sd-requirement-llm-handoff.md)는 당시 범위 기록이며 현행 분석·화면 상태는 ADR 033과 오늘 종결 보고를 따른다. 실제 회사 LLM 검증은 미완료.

Requirement Intake 검증: 신규 H2 API 통합 테스트와 Frontend build/lint 통과. 기존 전체 Backend 테스트 22건은 신규 통합 테스트 추가 전에 통과했으며 이 실행에서 연결된 Supabase PostgreSQL에 Flyway V5가 적용되었다. 추가 변경 후 전체 Backend 재실행은 외부 DB 변경 위험으로 자동 승인 검토가 거부되어 보류했고, 신규 대상 테스트만 H2로 재검증했다. 화면은 프로젝트 Context 선택 후 `요구사항 관리` 메뉴에서 확인한다.

- `frontend/`, `backend/`, `database/` Full Stack Repository 구조
- Java 21 + Spring Boot 3.5 기반 Backend Foundation
- JPA/Hibernate + MyBatis 혼용 기반과 Flyway Migration 경로
- 공통 API 성공·오류 응답과 Validation 예외 처리
- `/api/health`, Actuator Health, OpenAPI/Swagger UI
- Codespaces Java + Node + PostgreSQL 개발환경과 포트 전달
- Frontend·Backend를 함께 검증하는 GitHub Actions
- Maven Wrapper 기반의 OS 공통 Backend 실행과 PostgreSQL 없는 로컬 Spring Boot 스모크 프로필
- Core DB 상태 API와 REST → Service → MyBatis → H2 → Flyway V1 Marker 자동 통합검증
- Supabase PostgreSQL 17.6에서 Flyway V1 적용과 Core MyBatis Marker 조회 통합검증
- Flyway V2 `BSYCDGP`·`BSYCMCD`, JPA Schema 검증, MyBatis CRUD와 공통코드 REST API
- 공통코드관리 화면의 Backend 실데이터 조회 연결과 중복 Mock·타입 제거
- 공통코드관리 표준 CRUD 화면: 코드그룹 Master 선택, 공통코드 Detail 조회, 권한 기반 등록·수정·삭제, 공통 Form Modal, 즉시 목록 갱신과 사용자 오류 메시지
- 공통 DataTable/Grid 규격: 288px 기본 최소 높이, 416px 최대 높이 내부 Scroll, Header 34px, Row 32px, fixed/min/flex 컬럼 폭과 말줄임·전체값 Tooltip
- 공통코드 그룹별 동적 업무속성 기반: DATA/CONTROL/DISPLAY TYPE 분리, `BSYCADF` 정의·`BSYCAVL` 값, `FieldDefinition` Adapter와 공유 Metadata Grid/Form Renderer
- 공통 Master-Detail Multi-Grid 표준: 40:60 좌우 분할, Detail 38:62 상하 분할, 가용 Workspace 높이 기반 Grid와 고정 Message Area
- 공통 ActionButton: 동일 Action Code를 Icon + Text 또는 Icon Only로 렌더링하고, neutral compact token을 사용
- 공통 ActionButton 개인화: `UiPreferences` Adapter/Provider 기반 `ICON_TEXT`·`ICON_ONLY` 즉시 반영과 LocalStorage 유지, Skin Accent Save/Search/Danger semantic token
- 공통 `BaseKitMessage`: INFO/WARN/ERROR/SUCCESS 상태를 공통 icon·semantic token으로 표시하고 공통코드관리 32px 하단 Message Area에 적용
- 공통코드관리 AG Grid Inline Batch CRUD 1차: 코드그룹·속성정의·공통코드의 INSERTED/UPDATED/DELETED 상태 추적, 삭제 예정 표시와 배치 트랜잭션 저장 API
- 공통 AG Grid Metadata Editor/Validation: `FieldDefinition` 기반 NUMBER·SWITCH·SELECT·COLOR Editor 선택, REQUIRED·허용값 검증과 저장 차단, Header Pencil 제거

- React + Vite + TypeScript
- Compact 한 줄 Header / 1Depth Top / 2~3Depth Sidebar / Workspace 기반 Admin Shell
- Sidebar 전체 열기·닫기와 2Depth GROUP Accordion
- MDI Tab 열기, 전환, 개별·현재 외·전체 업무 Tab 닫기, 목록 및 이전·다음 이동
- Compact 업무 UI
- 사용자관리, 메뉴관리, 공통코드관리 Mock 화면
- 검색 Page Type 1 개발자 샘플
- 설정 기반 검색 Control 자동 생성과 공통 Action Rail
- 검색조건 1~5단 Layout, 조건 수 Guard와 첫 1단 유지 접기
- 개발자가이드 검색영역 1~5단 시각 검수 전환
- 검색 샘플 `types/config/mock/repository/page` 책임 분리
- Page 중심 구조와 실제 3단 검색을 적용한 Search Sample Type 2
- `frontend/meta/*.json` 기반 Metadata Repository
- Program Component Registry
- `ROLE × PROGRAM × ACTION_CODE` 계약과 `hasAction()` 기반
- Program/Menu/Action 참조 및 메뉴 최대 3Depth 검증
- GitHub Pages main 배포
- dev-pm 대상 PR 자동 build
- 행정안전부 공공표준용어 13,176건 조회·검색·페이징과 항목별 정제 Workbench
- 공공표준 원본과 BaseKit 정제 결과 분리
- 로컬 개발환경 `frontend/meta/term-curation.json` 안전 저장 및 정적 배포 브라우저 임시저장·JSON 내보내기
- 단어관리와 도메인관리 JSON Prototype
- 등록 단어 조합, 마지막 도메인 단어 Guard와 논리명·물리명·도메인 자동 미리보기
- 단어 신규등록·수정검토·검수완료 상태와 등록 전 유사어 검사
- 행정안전부 공통표준단어 3,284건 원본 반입과 용어 13,176건 약어 기반 자동 분리
- 용어 완전분리 12,523건과 미매칭 653건 구분
- 프로그램 선택 시 Sidebar 자동 닫기
- 표준데이터관리 2Depth 아래 단어·도메인·표준용어 3Depth 구성
- 용어 조합 단어 Drag & Drop 및 좌우 순서 변경
- 1Depth 클릭 2~3Depth 레이어 메뉴, 햄버거 클릭 좌측 Sidebar, 프로그램 선택 시 자동 닫기와 Sidebar Pin 고정·해제
- 기본·그린 스킨 선택과 핵심 색상 5개 Color Picker 기반 개인화·브라우저 저장
- 업무용 최적 1920×1080, 설계 기준 1440×900, 최소 1280×800 및 1280~1439px 노트북·태블릿 가로 반응형 기준
- 개발·검수 사이트 검색 `noindex` 적용, 공개 데이터·대표 AI 수집 봇 robots 정책 정의(도메인 루트 적용은 배포 환경 과제)
- 고객 용어집 전환 시 변경 대상·수정 상태·영향 프로그램·재테스트 증적을 관리하는 Impact Register 아이디어 승인
- 전체 사전 선행 정제 대신 기능 개발에 사용되는 단어·용어부터 검수하고 배포 시 APPROVED를 요구하는 점진 정제 정책 확정
- Hibernate/JPA는 Schema·DDL 초안, MyBatis는 업무 SQL, 운영은 승인된 Migration을 사용하며 관계 등급별로 물리 FK를 선택하는 정책 확정
- Header 알림 Badge 영역과 알림 count 표시 계약
- 시스템관리 > 테이블관리 메타데이터 조회 화면: 시스템 공통 V1 테이블 목록, 컬럼 정의, PK/FK, 필수 여부, 도메인과 용어 검토 상태 표시
- `frontend/meta/schema-tables.json` 기반 시스템 공통 V1 Schema Catalog Prototype
- 7자리 테이블명 `B + 모듈 2자리 + 테이블 코드 4자리`와 마지막 4자리 고정 SQL Alias 규칙
- 공통 감사 컬럼 `REG_DT`, `REG_BY`, `MOD_DT`, `MOD_BY`와 사용·논리삭제 `USE_YN`, `DEL_YN` 규칙
- Schema Catalog 공통 컬럼 자동 합성과 Frontend/Backend 공통 Base Entity 계약
- 공통 AA가 관리하는 `basekit-core`·`basekit-system-starter`를 업무 프로젝트에 임베드하고 필요 시 빈 Host로 실행하는 배포 Architecture 결정
- 개발자가이드 > BaseKit 문서센터에서 README와 docs Markdown 자동 수집·검색·상태별 조회
- `docs/releases` 기반 개발 반영 공지와 실제 샘플 프로그램 검수 동선 분리
- Product Module이 메뉴·프로그램·권한·Component를 소유하는 최소 Module Manifest와 Host Registry
- Standard Design 첫 Product Module의 프로젝트 관리·고객 표준 관리·화면 설계 Skeleton
- Standard Design 등록 제거 상태에서 BaseKit Core 단독 Production Build 검증
- Standard Design 회사 LLM Backend 경유 연결 Port/Adapter와 화면 설계 임시 연결 점검 UI
- 회사 LLM HTTP Client를 단순 요청 Factory로 고정하여 Windows 기동 시 JDK Client 자동구성 의존 제거
- Standard Design 화면 설계에서 회사 LLM에 직접 질문하고 단일 응답을 확인하는 저장 없는 Prompt Panel
- Standard Design 원본 CSV 기반 read-only 표준용어집 Adapter/API와 목록·상세 조회 화면
- Standard Design LLM 표준용어 추천 PoC: 후보 제한 context와 원본 상세 ID 재검증
- Standard Design LLM 추천 응답의 canonical CSV 재조립과 자유서술 표준정보 hallucination 차단
- Standard Design DA Design Lifecycle 1차: 프로젝트 Context, 계층 WBS, 요구사항 중심 WBS·화면·테이블 추적성, 화면/필드 및 DB 테이블/컬럼 계약, Schema Catalog 참조와 CRUD UI Skeleton
- Standard Design DA Lifecycle UI 표준화 Phase 1: Project/WBS/Requirement/Screen/DB 화면에 공통 Master-Detail Multi-Grid, 32px Message Area, retained Project Context, CRUD Toolbar와 Screen Field/DB Column Detail Grid 적용
- Standard Design 프로젝트 관리 Reference UX Phase 2: LIST 100%, 기본 30/70 resizable List-Detail, splitter 기반 목록 접기/펼치기와 Detail 100%, 검색·조회결과·선택 유지, compact ID, 저장 전 신규·SIMPLE_COPY 초안, 의미 있는 상태 메시지와 내부 scroll 적용. 현재 기준 branch에는 공통 List-Detail workspace가 없으므로 Module 내부 구성으로만 구현. 사용자 승인으로 dev-pm 통합, UI 및 자동 검증 완료([인계 보고서](project-reference-handoff.md))
- Standard Design Lifecycle Program의 Hash 경로 동기화: 기존 MDI 메뉴 진입과 새로고침 후 프로젝트·WBS·요구사항·화면·DB 설계 화면 복원
- Standard Design 프로젝트 관리 List-Detail UX: 프로젝트명 직접 상세 열기, LIST/DETAIL/DETAIL_EXPANDED 분리, 왼쪽 Working Set 검색/목록 유지, 상세 Mini Search Dialog, 조회 조건·결과·선택 유지, 신규·수정·복사·삭제 흐름 정리

## 3. 문서만 설계 완료

- 시스템 공통 V1 DB 구조 Draft: 회사·조직·직무·사용자·계정, 내부/공급업체 사용자 배정과 역할·프로그램·액션 권한 경계. UI Catalog까지 구현했으며 실제 DDL·Migration은 미구현
- Maven Artifact 분리, 내부 Repository 발행과 소비자 샘플 프로젝트
- Grid, Uploader, Editor, PDF Adapter
- 조직·법인·사용자 예외 및 데이터 범위 권한
- AI 메뉴 매뉴얼
- Business Object Lifecycle
- Internal/External Approval Provider
- Callback 멱등성, Status Query, Reconciliation
- Notification, Audit, Interface, Event Outbox

Lifecycle 문서는 `docs/basekit-business-object-lifecycle-architecture.md`에 Draft로 관리한다.

## 4. 코드와 문서 또는 목표의 불일치

- `hasAction()` 기반은 있으나 로그인 사용자 Context와 버튼 자동 제어는 연결되지 않았다.
- 회사관리, 역할관리, 시스템설정 Page 파일 일부는 존재하지만 현재 Program Registry와 메뉴에 연결되지 않았다.
- 실제 Backend 권한 검증이 없으므로 Frontend 권한만으로 보안을 보장할 수 없다.
- 표준용어 정제 결과는 JSON 단계이며 DB 저장, 동시 편집, 세부 변경 이력은 아직 없다.

## 5. 아직 결정 필요

- 로그인 사용자/역할 Context
- 버튼 숨김, 비활성화, 읽기전용 정책
- Backend 권한 검증과 데이터 범위 권한
- Lifecycle ERD, 동시성, Projection, Outbox, Version
- 외부결재 취소·회수 및 Callback 보안
- 공공표준 용어의 BaseKit 채택 기준과 기존 `PERMISSION` 등 명명 충돌 처리
- 채택 용어의 `terms.json`·`domains.json` 승격 승인 절차
- 동일한 마지막 단어에 복수 도메인이 연결될 때 도메인 선택 규칙
- 용어 조합 결과의 승인·등록·폐기·영향 분석 Workflow
- Schema Catalog의 REVIEW 용어 확정 및 승인된 Flyway DDL 승격 절차
- `SYST`, `SYCO`, `IUAS`, `VUAS`, `RPAC` 테이블 코드 가독성 최종 검토
- 삭제 복구·물리 파기 예외·감사값 입력 책임·동시성 Version은 시스템 공통 구현 후 일괄 검토
- Starter 실행 모드, Migration 소유자와 Scheduler 중복 실행 방지 방식
- Screen Field와 DB Column의 명시적 연결 계약 및 검증 정책
- 회사 LLM 실환경 URL·인증정보 주입 후 Connectivity 검수

## 6. Git 및 PR 상태 확인

작업 시작 시 문서에 적힌 branch 이름을 그대로 믿지 말고 다음을 실행한다.

```powershell
git fetch origin --prune
git status
git branch -a
gh pr list --repo caronkwon-dotcom/baseKit
```

작업 흐름은 `feature → dev-pm → 로컬 검수·승인 → main`이다. 자세한 기준은 ADR 008을 따른다.

## 7. 우선순위 WBS

프로젝트는 원칙적으로 주 1회 주말 작업을 기준으로 운영한다. 매 작업 시작 시 이번 주 목표와 완료 기준을 정하고, 종료 시 현재 상태와 다음 작업을 갱신한다. 새로운 아이디어가 들어오면 `docs/ideas/`에 먼저 기록하고 영향과 긴급성을 검토해 우선순위를 조정한다.

### WBS 0. 복구·문서 영속화

목표: PC와 대화 기록을 잃어도 GitHub clone만으로 작업을 재개한다.

완료 기준:

- AGENTS, README, 복구 가이드, 현재 상태, ADR 일치
- Node.js와 검증 명령 명시
- 중요 Context가 Repository에 보존됨

### WBS 1. 메뉴 3Depth UI

선행조건: Metadata Repository와 최대 Depth 검증 완료.

범위:

- 1Depth Top Menu
- 2~3Depth Left Sidebar
- 활성·열림 상태
- 4Depth Guard 검증
- MDI 동작 유지

완료 상태:

- 1Depth Top Menu와 선택 영역별 Sidebar 구현
- 2Depth GROUP Accordion과 3Depth Program 구현
- Sidebar Toggle과 작은 화면 Overlay 구현
- Home 고정, MDI 목록·이동·일괄 닫기 구현
- Drag & Drop 순서 변경은 사용성 검증 후 별도 후보로 유지

### WBS 2. 로그인 권한 Context

범위:

- 로그인 사용자와 역할 Mock Context
- `hasAction(programKey, actionCode)` UI 계약
- 공통 Action 설정과 버튼 제어
- Backend 검증 경계 문서화

### WBS 3. 시스템관리 기준 화면

범위:

- 회사, 역할·권한, 시스템설정 연결
- 공통 Search/Grid/Detail 패턴
- Mock Repository와 향후 REST Adapter 경계

### WBS 4. Business Object Lifecycle V1 설계 확정

범위:

- V1 ERD
- Transaction과 동시성
- Projection과 History
- Internal Approval
- Event/Outbox 결정

설계 승인 후에만 구현 WBS를 시작한다.

### WBS 3-1. 표준용어·도메인 Foundation

범위:

- 공공표준용어 원본 조회와 정제 상태 관리
- BaseKit 물리명, 도메인, 별칭과 검토 메모 관리
- 단어·용어·도메인 관리 모델 및 검증 규칙
- 논리명 기반 컬럼 설계와 DDL 생성으로 단계적 확장

현재 상태:

- 용어 정제 List View와 JSON 저장 Prototype 구현
- 단어·도메인 관리와 용어 조합 Guard Prototype 구현
- 채택 승격, 기존 용어 자동 분해, DDL 생성은 후속 작업

### WBS 5. 공통 Starter 배포 경계

범위:

- 현재 시스템 공통 V1의 공개 API·SPI·내부 구현 경계 정의
- 임베드 Starter와 선택형 빈 Host의 동일 Artifact 사용
- Migration·Scheduler·관리 API 중복 실행 Guard
- 내부 Maven Repository 발행과 고정 Version 적용 절차
- 소비자 샘플 프로젝트를 통한 Patch·영향범위·회귀검증 확인

현재 상태:

- 배포 Architecture와 단계적 적용 순서 확정
- 현재 단일 Repository를 유지하며 시스템 공통 V1 계약을 먼저 완성
- 통합 Frontend Portal과 상용 UI 라이선스 전략은 후속 아이디어로 분리

### WBS 6. Product Module Foundation

목표: BaseKit Core를 유지하면서 Product Module이 자기 화면과 Metadata를 독립적으로 소유한다.

완료 상태:

- `ApplicationModule` Manifest와 Host Module Registry 구현
- Standard Design 초기 3개 화면을 Module Manifest로 등록
- 중앙 Program 목록은 BaseKit Core 프로그램만 관리
- Module 등록 제거 후 BaseKit 단독 Build 검증

다음 범위:

- Screen Field-to-Column 수동 연결과 검증 정책
- 설계 대상 시스템의 Menu·Role·Program Metadata와 BaseKit Runtime 권한의 명확한 분리

## 8. 다음 추천 작업

### dev-pm 반영: AG Grid 입력 길이·YN 표시 보정

- Schema Catalog의 문자열 길이를 `FieldDefinition.maxLength`로 전달하고 Grid 편집 중 현재/최대 길이를 표시한다.
- 최대 길이 초과 입력과 붙여넣기는 Cell Editor에서 차단하며 Backend 검증은 최종 방어선으로 유지한다.
- 길이 검증 오류는 사용자용 필드명 메시지로 변환하고 YN Switch Cell의 말줄임과 최소 폭을 보정한다.
- 이번 변경은 `feature/ag-grid-input-ux-length-switch`에서 검증한 뒤 dev-pm에 통합했다.

### dev-pm 반영: AG Grid Community 1차 PoC

- 코드관리 3개 Grid에만 AG Grid Community 36.2.0 Wrapper/Adapter 적용. FieldDefinition·MetadataForm·Backend/DB 계약과 기존 Grid 보존.
- 20/500/2,000행 동적 컬럼·스크롤, 선택·정렬·Resize, 독립 Inline Editing Fixture 검수 완료.
- Build/TypeScript/Lint, Backend 21 tests, Adapter 검사 통과. 상세 결과와 화면 캡처는 [PoC 보고서](poc/ag-grid-community-poc.md) 참고.
- dev-pm에 PoC를 반영했으며, 전면 채택 또는 다른 화면 Migration은 결정·구현하지 않았다.
- 다음 작업: PoC 결과를 기준으로 전체 채택 여부와 후속 화면 Migration 범위를 결정한다.
### 진행 중: PROGRAM 관리 DB화

- `BSYPROG` Flyway V4, JPA Schema Validate, MyBatis CRUD와 REST API 구현
- DB PROGRAM과 Frontend Component Registry 책임 분리
- 공통코드 Option Source와 `FieldDefinition / MetadataForm / ProgramDataGrid` 재사용
- MENU·ROLE·PERMISSION DB화는 이번 범위에서 제외

Standard Design의 `Screen Design Schema v0.1`을 정의하되 상세 UI 구현 전에 설계 대상, 화면 구조, 검색·그리드·상세·Action Metadata와 Version 경계를 확정한다. BaseKit 시스템 공통 V1 DDL·Backend 연결은 독립 WBS로 유지한다.

연말까지의 목표는 Level 1 시스템 Foundation의 핵심 규약, 기준 화면, 개발자 가이드와 Frontend 공통 구조를 실제 다음 SI 프로젝트에서 시작점으로 사용할 수 있는 수준까지 확보하는 것이다. 주간 목표는 이 목표에 기여하는 작은 검증 단위로 나눈다.

## 9. 갱신 규칙

- 기능 PR이 `dev-pm`에 병합될 때 관련 상태를 갱신한다.
- 완료된 작업은 WBS에서 제거하지 않고 구현 완료 영역으로 이동한다.
- 일시적인 로그, 대화 원문, 특정 작업자 지시는 기록하지 않는다.
- PR 번호는 진행 중 확인에 꼭 필요한 경우만 일시적으로 기록한다.
- 미구현 아이디어는 구현·설계 완료 항목과 섞지 않고 `docs/ideas/`에서 상태별로 관리한다.
- 아이디어가 승인되면 관련 ADR, Architecture 문서와 WBS로 이동한다.
- 주간 작업 종료 시 완료 내용, 남은 문제, 다음 주 목표를 갱신한다.

## Grid 공통화 2차 작업 (2026-09-27, dev-pm 반영)

`codex/grid-commonization-phase-2`는 `dev-pm` `24db386`에서 시작해 `0d4367f`에 통합했다. `BaseKitDataGrid`가 행 상태 저장소의 추가·선택 행 삭제를 권한 적용되는 Grid Toolbar Action으로 연결하는 `batchActions` 계약을 제공하고, 선택 행이 없을 때 삭제 Action을 비활성화한다. L1R2 Master Grid 샘플은 이 계약을 사용한다. Frontend build/lint와 `git diff --check`를 통과했다. Backend 테스트는 Backend 변경이 없고 이 환경에서 외부 DB 연결 가능성이 있어 실행하지 않았다. 실제 UI 검수는 수행하지 않았다. 작업 시작 당시 있던 검색 가이드 변경, 첨부 데이터, 별도 미추적 파일은 이 기능과 무관하여 별도로 보존한다.

## Grid Row State CSS 공통화 보완 (2026-09-27)

`BaseKitDataGrid`는 `GridRowState`를 `NORMAL / INSERTED / UPDATED / DELETED` 표준 행 class로 변환하고 사용자 class 및 `currentRowKey` class와 함께 적용한다. `CodeManagePage`의 중복 상태 class 매핑은 제거했으며 기존 `basekitGrid.css` 디자인은 변경하지 않았다. Frontend 테스트 38건, build, lint, `git diff --check`를 통과했다. L1R2 브라우저 확인에서 선택 상태가 INSERTED/DELETED 배경을 덮지 않았고 DELETED 취소선·아이콘, 현재행과 상태 class 공존, 신규 행 삭제 정책을 확인했다. CodeManagePage는 공통 경로 및 회귀 테스트로 확인했으며 실제 Backend 데이터가 필요한 화면 조작은 수행하지 않았다.

## Project Working Set 후속 검수 (2026-09-20)

`feature/project-working-set-search`에서 `fe55992` 기반 후속 초안 `5bef92f`를 보존하고 Mini Search/Working Set 개선을 마무리했다. 이번 변경은 dev-pm 미통합이다. 중복 context 제거, 좌우 action 분리, 조회 스냅샷 유지, FormModal 재사용, 상세 저장 후 작업 집합 유지가 구현됐다. build/lint, Project 회귀 9개, grid assertion 18개, backend 22개 통과. 실제 UI 주요 흐름 확인; 삭제 확인창 이후 브라우저 제어 제한과 미검증 오류 주입 범위는 [인계 보고서](project-reference-handoff.md)에 기록했다.

Project Working Set 후속 변경은 2026-09-20 사용자 명시 승인으로 dev-pm 통합한다. 공통 버튼 설정 79f224b를 보존하여 함께 검증했으며 UI 미확인 범위는 인계 보고서를 따른다.

## Project Inline Search 후속 개선 (2026-09-20, feature 검수 대기)

`feature/project-inline-search`는 dev-pm `9b0eff5` 기준이다. 중앙 검색 Dialog를 왼쪽 Inline Search로 교체하고 폼 label/input을 좌우로 통일했다. 상세 identity와 검색 결과를 분리하며 결과 밖 기존 상세 저장은 Working Set에 추가하지 않는다. 버튼 label 표시는 Project 화면에서만 명시한다. build/lint, Project 11개, grid 18개, backend 22개 통과. 실제 UI 검증 범위와 native confirm 도구 제한은 [후속 보고서](project-inline-search-verification.md)를 참고한다. 이번 변경은 dev-pm 미통합이다.

## Project Foundation / Shared Project Context (2026-09-23, feature 검수 대기)

`feature/da-project-foundation`은 최신 `origin/dev-pm` `2e48aacc`에서 시작했다. Project 기본정보에 필수 시작/종료일과 기간 검증을 추가하고, USER와 분리된 MEMBER 프로필 및 프로젝트별 PROJECT_MEMBER 투입정보를 browser localStorage 기반 Reference로 구현했다. WBS, Requirements, Screen Design, DB Design에 PageHeader Project Context 선택기를 제공하고, 컨텍스트가 없으면 진입 전 선택을 요구한다. Project Management는 선택 프로젝트가 없을 때도 진입 가능하다. DB/API Migration은 없다. 상세 정책은 [ADR-031](decisions/031-standard-design-project-foundation-and-context.md)을 따른다. 자동 검증은 frontend build/lint, frontend regression 15개, backend 22개 통과. 브라우저에서는 프로젝트 상세와 멤버 등록, context guard에서 프로젝트 선택 후 WBS 표시를 확인했다. 빈 프로젝트 저장소 상태, 다중 프로젝트 context 전환, 좁은 뷰포트 세부 접근성은 추가 검수 대상으로 남긴다.

## Project Foundation UI Fix (2026-09-23, feature 검수 대기)

`feature/da-project-foundation-ui-fix`는 최신 `origin/dev-pm` `03179a2`에 미병합 상태였던 Project Foundation feature를 보존 병합한 뒤 UI 검수 누락만 보완했다. WBS, Requirements, Screen Design, DB Design의 compact Project Context selector와 조회/등록/저장/삭제 Action을 PageHeader 우측 한 영역으로 정렬하고 본문의 별도 Action 행을 제거했다. Project Search Dialog는 기존 Project 검색 조건과 filter 함수를 재사용한다. 브라우저에서 Project 날짜/Member Grid, Member 추가, 2개 프로젝트 context 전환, 4개 SD 화면 context 유지, context 없는 직접 진입 Guard와 취소 시 기존 화면 유지를 확인했다. 프로젝트 전환 뒤 이전 Member 선택 ID가 남는 회귀도 함께 수정했다.

후속 UI 정리에서는 Project List의 `신규`, Detail의 `신규/복사/저장/삭제`를 PageHeader 우측으로 이동했다. Detail Master는 `프로젝트 목록 (N건) / 검색`과 Working Set Grid를 유지하고, 검색은 LIST와 동일한 Inline Search를 Grid 상단에서 펼치거나 접는다. Project Context 선택에만 공통 Project Search Dialog를 사용한다. Project 기본정보는 3열 compact form과 2행 설명으로 줄였고 Project Member Grid가 남은 높이를 사용한다. WBS, Requirements, Screen Design, DB Design Header의 상시 설명문도 제거했다. 모델, Repository, 저장 및 Context/Guard 로직은 변경하지 않았다.

## UI-03 HIGH 위험 보정 (2026-09-24, dev-pm 반영)

`codex/ui03-high-risk`는 `origin/dev-pm` `ffa806a` 기준으로 공통 Grid의 기본/사용자 지정 Toolbar Action에 동일한 `ROLE × PROGRAM × ACTION_CODE` 필터를 적용하고, 공통코드관리의 행추가·행삭제·변경취소·저장 권한을 명시한다. 우측 속성정의·공통코드는 저장한 Dataset만 재조회하여 다른 Grid의 미저장 변경을 유지한다. dev-pm에 반영됐으며 UI-03 Catalog 승격은 아직 하지 않았다. Frontend build/lint, 관련 테스트 18개, Backend 테스트 22개와 격리 Mock API 브라우저 저장·변경취소 검증을 통과했다.

## Compact Business UI Density (2026-09-24, dev-pm 반영)

`codex/compact-business-ui-density`는 `origin/dev-pm` `ffa806a`에서 시작한 독립 변경이다. 공통 PageHeader와 SearchPanel의 세로 여백, 검색 Control 높이(30px), Workspace 간격만 조정한다. 공통코드관리 1440×900 화면에서 PageHeader 24.8→26px, SearchPanel 55.6→41.6px, 첫 Grid 시작 위치 177.2→158.4px로 측정했다. Grid CRUD, 40:60/38:62 비율, Toolbar와 Message Area 높이는 변경하지 않았다. dev-pm에 반영됐다.

## Ultra Compact Density (2026-09-25, dev-pm 반영)

`codex/ultra-compact-density`는 `origin/dev-pm` `191f871`에서 시작했다. 공통 Top Navigation, PageHeader, SearchPanel과 문서센터 Toolbar의 상단 밀도만 조정한다. 1440×900 공통코드관리 기준 Top Navigation 46→42px, PageHeader 26→24px, SearchPanel 41.6→35.6px, 검색 Control 30→26px이며 첫 Grid 시작 위치는 158.4→145.4px이다. 문서센터 Toolbar는 38→36px, 본문 높이는 734→743px이다. Grid Row/Inline Editor와 Message Area는 유지한다. `d08718c`에서 dev-pm에 반영됐다.

## UI-03 Reference Source 정리 (2026-09-26, feature 검수 대기)

`feature/ui03-reference-source-standardization`은 `origin/dev-pm` `bc7b7b6` 기준이다. 공통코드관리 AG Grid의 ColDef 생성 경로를 Production `BaseKitDataGrid → gridColumnAdapter.toGridColumns`로 단일화하고 `GridEditing<T>`와 동적 Metadata 컬럼 Key 계약을 공유한다. 저장 Payload Mapper와 JSX 명명을 정리했으며, 운영 화면에서 사용하지 않는 `MetadataAgGrid`는 PoC 영역으로 격리했다. Production Adapter 회귀 테스트와 기존 Grid 테스트를 통과했지만, UI-03 Catalog 최종 승격은 PM 승인 전이다. 동적 속성별 `maxLength`는 현재 정의 Type·DTO·DB Schema에 없으므로 임의 길이 규칙을 추가하지 않았다.

## 공통 Excel Import V1 (2026-09-30, codex-work 검수 대기)

`frontend/src/components/common/excel`에 업무 독립적인 Excel Template 생성, `.xlsx/.xls` 첫 Sheet 파싱, Header/필수값/빈 Row 검증, 업무별 Row Validation·Mapping callback, Preview Grid, 정상/오류 건수 표시를 구현했다. UI는 기존 `FormModal`과 `DataTable`을 재사용하며 Import 전에는 저장 callback을 호출하지 않는다. Header 오류 또는 Row 오류가 있으면 Import를 막고, 오류가 없는 유효 Row만 `mapRow → onImport`로 전달한다. 업무 화면에서는 `ExcelImport`에 `columns`, `validateRow`, `mapRow`, `onImport`만 연결한다.

추가 dependency는 `xlsx`이며, Template은 정적 `/public` 파일이 아니라 Column Definition으로 동적 생성한다. Requirement 화면/API/DTO는 연결하지 않았다.
## Program Discovery 기반 프로그램 관리 V1 (2026-09-30, codex-work 검수 대기)

기존 `programDiscovery`, Module Manifest, Core Registry와 읽기 전용 `BSYPROG` 조회를 병합해 Source/DB 상태(`AVAILABLE`, `NEW`, `MISSING_SOURCE`)를 표시하는 프로그램 관리 V1을 구현했다. 화면은 공통 `MasterDetailMultiGrid`의 stacked 모드로 Program Grid 상단·Action Grid 하단을 배치하고, `ProgramDataGrid`, `BaseKitDataGrid`, `useGridRowState`, 공통 Editable Cell/YN Switch/Message Area를 재사용한다. Program의 Registry 필드와 Action의 운영 편집 필드는 Inline Batch 상태(`UPDATED`) 및 변경취소를 지원하며, Program 저장은 기존 `programApi.update`를 사용한다. Action Registry 저장 API는 현재 계약에 없어 별도 API를 추가하지 않았다. Program과 Action은 Source 기준으로 목록화하며 COMMON/CUSTOM Action을 동일한 `ACTION_KEY` 계약으로 표시한다. DB에만 존재하는 Program은 삭제하지 않고 `MISSING_SOURCE`로 유지한다. Role 권한 UI와 Endpoint Enforcement는 범위에 포함하지 않았다.

## Menu V2 Backend Foundation (2026-10-03, codex-work 검수 대기)

`BSYMENU` Flyway V7과 JPA Schema Validate Entity, MyBatis CRUD/Tree Mapper, REST Controller, Service Validation, 도메인 예외 처리와 H2 통합 테스트를 구현했다. `MENU_LEVEL`은 저장하지 않고 Tree 응답에서 계산하며, Phase 1은 FOLDER/PAGE만 허용한다. FOLDER는 Program을 가질 수 없고 PAGE는 활성 `BSYPROG`를 필수로 참조한다. 기존 `frontend/meta/menus.json` Seed, MenuManagePage DB 연결, Runtime 전환, Role/Permission은 범위에 포함하지 않았다. H2 기반 전체 Backend 테스트와 Menu 통합 테스트를 통과했으며, 외부 PostgreSQL은 기존 V7 Migration checksum 불일치로 별도 검증이 보류되었다.

## 2026-10-05 COMMON SD Excel 지원

기존 columns/validateRow/mapRow/onImport 계약 유지. 파싱·반영 잠금, Preview 초기화, Header/행 오류 분리, 물리 Excel 행 번호, 선택 title/submitLabel/disabled 및 FormModal submitDisabled를 보완했다. 상세 계약과 검증은 [SD Excel COMMON 인계](sd-excel-common-handoff.md) 참고. Frontend build/lint 및 42건 테스트, 외부 DB 환경변수를 제거한 Backend 30건(5 skip)이 통과했다. SD 업무 로직·LLM Client·시스템 Program/Runtime/권한 변경은 없다. Modal focus와 실화면 SD/LLM 연결은 후속 검증 범위다.

## SD 요구사항 분석 V1 (2026-10-05, dev-pm 통합 완료)
- 구현: Flyway V9, `standarddesign/analysis` 백엔드(분석·후보·확정·생성 API), `RequirementAnalysisPanel` 4단계 UX, STALE·버전 충돌·생성 멱등성. 결정은 `docs/decisions/033-sd-requirement-analysis-v1.md`.
- 검증: 백엔드 전체 테스트(H2) 통과, Frontend lint/build/node test 46건 통과.
- 미검증: 실제 회사 LLM(`COMPANY_LLM_*` 미설정), 승인 DB(PostgreSQL), 브라우저 수동 검수.
- 후속 필수: Requirement 단위 Lock과 OWNER/LOCK OWNER 분리, `SD_*` 테이블 명칭 확정, 사용자 승인된 Program 메뉴 연결 정책.

## SD V1 리뷰 보완 (B01/B02/R01/R02/R04)

구현 완료·dev-pm 통합. 상세는 ADR 033 '리뷰 보완' 참조. 실제 LLM·분석 파이프라인의 PostgreSQL 통합 검증은 미완료.

## 요구사항 화면 정리 인수인계 (2026-10-05, dev-pm 통합 완료)

- 기존 sd / sd-work에서 Copilot 미커밋 변경을 보존하며 진행. 신규 branch/worktree 및 commit/push/merge 없음.
- 목록 DESCRIPTION 컬럼 제거, 요구사항명 전체 폭 및 요구유형+상태 같은 줄 배치 적용.
- 상세 AI 분석 탭과 import/렌더 연결만 제거. RequirementAnalysisPanel, backend/API/상태/테스트 구현은 KEEP하며 후속 요구사항 그룹 분석에서 재사용 예정. 신규 그룹 분석 기능은 구현하지 않음.
- 설계 의견: 기본정보 PROCESS_DESCRIPTION 아래에 입력을 연결하고 BSDRREQ.DESIGN_OPINION 및 기존 Requirement 조회/저장 API를 최소 확장. V11은 최신 분석 스냅샷 의견을 초기값으로 이관하며 BSDAAREQ 원본은 보존. 이전 클라이언트의 누락/null 의견은 수정 시 현재 값을 유지하고 빈 문자열은 명시적 삭제로 처리. 의견 변경은 기존 MOD_DT 버전 검사에 반영됨. 향후 그룹 분석은 이 필드를 입력으로 연결할 예정이며 이번 작업에서 분석 계약은 변경하지 않음.
- 검증: frontend build/lint 통과, 분석·Excel 단위 테스트 11건 통과, 전체 backend H2 test 프로필 42건(실행 37건 통과, 5건 skip), git diff --check 통과. 설계 의견 생성/수정/조회/목록/지우기 및 기존 클라이언트 호환 테스트 추가. 실제 브라우저 시각 검증·실제 PostgreSQL 적용·실제 LLM 검증은 미실행.
## SD dev-pm 최신화 및 backend 재빌드 (2026-10-05)

- sd-work에서 dev-pm/origin/dev-pm a928069을 fast-forward 병합. 기존 Copilot/요구사항 화면 정리 미커밋 작업은 stash 후 apply로 보존. 복구용 stash는 유지함. 신규 branch/worktree 및 push 없음.
- Flyway 오류 원인: DB 이력 V9=공통 endpoint permission(1801662515), V10=SD 분석(-488513351)에 비해 sd 파일 번호가 달랐음. backend와 database 폴더를 V9 공통 / V10 분석 / V11 설계 의견으로 통일. 기존 V9/V10 SQL 본문 및 DB 이력은 수정하지 않음.
- clean package + H2 test 프로필: BUILD SUCCESS, 46건 중 41건 통과/5건 skip. frontend build/lint 통과. 실제 PostgreSQL 시작 및 V11 적용은 이 검증에서 수행하지 않음.

최종 Grid 회귀 검수: 원격 dev-pm 62ffb79 build/lint·frontend 50/50·backend 42건(실패 0, 조건부 제외 5) 및 Chrome 6조합 통과. 원래 로컬 dev-pm 836d991 build/lint·frontend 53/53 통과. disabled/read-only 스타일, Batch UPDATED/INSERTED 및 프로그램 유형 실제 Select editor 테두리 확인. 로컬 의존성 파일 잠금으로 설치가 일시 중단됐으나 복구 후 검증 통과.

## Form 보완 적용 (2026-10-05)

FormField LEFT 오른쪽 정렬/고정 140px track, 빨간 required dot 및 다국어 안내, 공통 FormSelect portal popup, 요구사항 신규/수정 필수 누락 오류를 구현했다. UI commit 99fb974. 원격 dev-pm a93c72c 현행화 기준. build/lint/frontend 53/backend 46(조건부 제외 5) 및 실제 1280/1440/1920/공통 480px 검수 통과. API/DB/권한/업무 검증 의미 유지. 상세는 form-layout-required 작업 문서 11절. COMMON 추가 차단 협의 없음.
