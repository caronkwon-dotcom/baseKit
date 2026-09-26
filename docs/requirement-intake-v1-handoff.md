# Requirement Intake V1 구현 인계

기준 branch: `codex/requirement-intake-v1` (기준 `origin/dev-pm` 426811f). 구현 commit: a91ef6f. 승인된 경계: [ADR-031](decisions/031-requirement-intake-backend-boundary.md).

## 1. 변경 파일

| 영역 | 파일 |
|---|---|
| DB | `database/migration/V5__create_requirement_intake.sql` |
| Backend REST/Service/DTO | `RequirementController.java`, `RequirementService.java`, `RequirementSaveRequest.java`, `RequirementData.java`, `RequirementRow.java`, `AttachmentData.java`, `RequirementExceptionHandler.java` (`backend/src/main/java/com/caron/basekit/standarddesign/requirement/`) |
| Backend SQL/Schema 검증 | `RequirementMapper.java`, `RequirementJpaEntity.java`, `RequirementMenuJpaEntity.java`, `AttachmentJpaEntity.java`, `backend/src/main/resources/mapper/standarddesign/RequirementMapper.xml`, `backend/src/main/resources/application.yml` |
| Backend Test | `backend/src/test/java/com/caron/basekit/standarddesign/requirement/RequirementIntegrationTest.java` |
| Frontend | `frontend/src/modules/standard-design/requirement/requirementApi.ts`, `ui/pages/RequirementIntakePage.tsx`, `ui/components/ProjectContextSelector.tsx`, `ui/components/ProjectListDetailWorkspace.tsx`, `module.tsx`, `standardDesign.css` |
| 문서 | `docs/decisions/031-requirement-intake-backend-boundary.md`, `docs/ideas/requirement-intake-v1-storage-boundary.md`, `docs/basekit-current-status.md`, 이 문서 |

## 2. DB Migration / Data Model

V5는 기존 테이블을 변경하지 않고 다음을 추가한다.

| 테이블 | 핵심 컬럼 | 관계 |
|---|---|---|
| `BSDRREQ` | `REQUIREMENT_ID` PK, `PROJECT_ID`, `REQUIREMENT_NAME`, `REQUIREMENT_TYPE_CODE`, `DESCRIPTION`, `PROCESS_DESCRIPTION`, `STATUS`, `LEGACY_*`, `REG_DT`/`MOD_DT` | Project ID 논리 참조. 서버에서 UUID 기반 REQ ID 발급. `(PROJECT_ID, LEGACY_SOURCE_ID)` 이관 중복 방지. |
| `BSDRRMNU` | `REQUIREMENT_ID`, `MENU_KEY` 복합 PK | Requirement 물리 FK. Menu는 기존 metadata key에 대한 논리 참조. |
| `BSDRATCH` | `ATTACHMENT_ID` PK, `REQUIREMENT_ID`, `ORIGINAL_FILE_NAME`, `STORAGE_KEY`, `FILE_TYPE`, `MIME_TYPE`, `FILE_SIZE`, `UPLOAD_DT`, `ANALYSIS_STATUS` | Requirement 물리 FK, 1:N. |

`REQUIREMENT_TYPE_CODE`는 새 공통코드 그룹의 활성 코드를 서버에서 검증한다. 상태는 기존 DRAFT/IN_PROGRESS/REVIEW/APPROVED를 유지한다. `LEGACY_WBS_IDS`, `LEGACY_SCREEN_IDS`, `LEGACY_TABLE_IDS`는 기존 관계 입력을 이관 중 보존하는 read-only 데이터다.

## 3. Backend 변경과 REST API

Spring REST → Service → MyBatis를 사용하고 JPA Entity로 DDL을 검증한다. API 응답은 기존 `ApiResponse`를 사용한다. 업로드 최대 크기는 20MB, 파일은 `STANDARD_DESIGN_ATTACHMENT_PATH`(기본 `./data/requirement-attachments`)에 불투명 key로 저장한다.

| Method | 경로 | 역할 |
|---|---|---|
| GET | `/api/standard-design/requirements?PROJECT_ID=...` | 프로젝트 목록, 메뉴 키와 첨부 메타데이터 포함 |
| GET | `/api/standard-design/requirements/{id}` | 상세 |
| POST | `/api/standard-design/requirements` | 생성 / legacy source 재시도 시 기존 건 반환 |
| PUT | `/api/standard-design/requirements/{id}` | 수정, 기존 legacy 연결값 보존 |
| DELETE | `/api/standard-design/requirements/{id}` | 요구사항과 종속 메뉴/첨부 삭제 |
| POST | `/api/standard-design/requirements/{id}/attachments` | `multipart/form-data`의 `file` 업로드 |
| GET | `/api/standard-design/requirements/{id}/attachments/{attachmentId}/file` | 이미지 inline, 기타 파일 다운로드 |
| DELETE | `/api/standard-design/requirements/{id}/attachments/{attachmentId}` | 첨부 삭제 |

## 4. Frontend / 재사용과 신규 요소

`SD_REQUIREMENT_DESIGN` Manifest가 새 Requirement Intake 화면을 연다. 프로젝트 `ProjectListDetailWorkspace` 및 30:70, 360/480px 최소 폭, Drag/Keyboard Splitter, 접기/펼치기 구조를 재사용한다. `ProjectContextSelector`, `PageHeader`, `DataTable`, `BaseKitMessage`, 기존 버튼/폼 CSS 토큰과 공통코드 API를 재사용한다. Splitter에는 접근성 라벨만 매개변수로 추가했다. 신규 화면과 `requirementApi`는 Backend 계약과 파일 목록/미리보기가 기존 Lifecycle CRUD와 달라 모듈 내부에 추가했다. 별도 UI Library나 Viewer Library는 없다.

입력은 자동 발급 ID, 이름, 공통코드 유형, 복수 메뉴, 요구사항·프로세스 설명, 상태다. WBS/화면/테이블 ID 입력은 없다. 첨부 List/Preview와 AI 분석 자리만 있다.

## 5. LocalStorage 이관과 전환 후 흐름

브라우저의 기존 `basekit.standard-design.lifecycle.v1` 실제 저장 데이터에서 선택 프로젝트의 미이관 요구사항 건수를 확인한다. 사용자가 `기존 데이터 이관`을 누르면 각 행을 서버로 전송하고 응답의 `LEGACY_SOURCE_ID`를 확인한다. 중간 실패 시 재실행해도 `(PROJECT_ID, LEGACY_SOURCE_ID)`로 기존 행을 반환한다. 원본 LocalStorage는 자동 삭제하지 않는다. 이관 후 화면은 서버 목록만 읽고 신규·수정·삭제도 서버 API만 호출한다. Project Context와 Menu 후보는 현재 Frontend Repository에서 읽고 ID/KEY만 Requirement API에 보낸다. 서버에는 Project/Menu Master와 해당 FK가 없다.

## 6. 검증 결과와 화면 확인

- Frontend `npm run build`: 통과 (기존 번들 크기 경고).
- Frontend `npm run lint`: 통과.
- 신규 H2 API 통합 테스트: 생성, 반복 이관, 수정, 메뉴 관계 교체, legacy 연결 보존, 파일 업로드/조회/삭제, 요구사항 삭제 통과.
- 기존 전체 Backend 테스트: 신규 테스트 추가 전 22건 통과. 이 실행에서 환경에 설정된 Supabase PostgreSQL에 Flyway V5가 적용되었다. 이후 전체 재실행은 외부 공유 DB 변경 위험으로 자동 승인 검토가 거부되었다. 최종 코드의 신규 대상 테스트는 H2에서 통과했다.
- `git diff --check`: 통과.

화면 확인: `npm run backend:run:local`과 `npm run dev`를 실행하고 프로젝트 Context를 선택한 다음 `Standard Design > 요구사항 관리`를 연다. 새 요구사항 저장, 복수 메뉴 선택, 파일 업로드 및 이미지 선택, Splitter Drag/접기/펼치기를 확인한다. 같은 브라우저에 이전 요구사항 저장 데이터가 있으면 이관 안내와 실행 버튼이 표시된다.

## 7. 호환성과 후속 확장

기존 LocalStorage 요구사항은 유지되며 명시적으로 이관할 수 있다. 기존 Project/WBS/Screen/DB 데이터와 동작은 이전하지 않았다. Menu 후보는 현재 `metadataRepository.getMenus()`의 SCREEN 메뉴이며 서버의 `MENU_KEY`는 논리 참조다. Project와 Menu의 서버 원본 및 참조 무결성 검증은 해당 Master의 향후 Backend 전환 시 결정한다. Attachment 분석 결과는 이후 별도 분석 결과 모델로 연결한다. AI 분석, 관계 추천, OCR, Process Diagram은 구현하지 않았다.
