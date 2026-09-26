# BaseFileUpload V1 구현 인계

기준 branch: `codex/base-file-upload-v1` (기준 `origin/dev-pm` 426811f). 선행 Requirement Intake V1의 Backend canonical 경계를 유지하면서 공통 파일 업로드 UI와 전송 경계를 추가했다.

## 1. Requirement DB Schema

`database/migration/V5__create_requirement_intake.sql`의 `BSDRREQ`가 Requirement 본문을 저장한다. `REQUIREMENT_ID`가 PK이며 `PROJECT_ID`는 현재 Project Context의 ID를 논리 참조한다. 설명, 프로세스 설명, 상태, 요구 유형과 명시적 LocalStorage 이관용 `LEGACY_*` 컬럼을 보유한다.

## 2. Requirement-Menu 관계 Schema

`BSDRRMNU(REQUIREMENT_ID, MENU_KEY)` 복합 PK를 사용한다. Requirement FK는 있지만 별도 Menu Master나 메뉴 데이터 복제는 없다. `MENU_KEY`는 기존 `metadataRepository`/BaseKit Menu Master의 canonical key를 논리 참조한다.

## 3. Attachment Schema

`BSDRATCH`는 `ATTACHMENT_ID`, `REQUIREMENT_ID`, 원본 파일명, 서버 생성 `STORAGE_KEY`, 확장자, MIME, 크기, 업로드 일시, `ANALYSIS_STATUS`를 저장한다. 현재 상태는 `NOT_ANALYZED`이며 향후 Extracted Text, OCR Result, LLM Summary, Structured Data와 연결할 확장 지점이다. 파일 바이트는 DB가 아니라 설정된 로컬 저장 경로에 저장한다.

## 4. REST API 목록

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/standard-design/requirements?PROJECT_ID=...` | 프로젝트 기준 Requirement 목록과 메뉴 키/첨부 메타데이터 |
| GET | `/api/standard-design/requirements/{id}` | Requirement 상세 |
| POST | `/api/standard-design/requirements` | 생성 및 이관 재시도 |
| PUT | `/api/standard-design/requirements/{id}` | 본문·메뉴 관계 수정 |
| DELETE | `/api/standard-design/requirements/{id}` | Requirement와 종속 첨부 삭제 |
| GET | `/api/standard-design/requirements/attachments/policy` | 업로드 허용 확장자, MIME, 크기, 개수 정책 |
| POST | `/api/standard-design/requirements/{id}/attachments` | `multipart/form-data`의 `file` 업로드 |
| GET | `/api/standard-design/requirements/{id}/attachments/{attachmentId}/file` | 이미지 inline 조회, 그 외 다운로드 |
| DELETE | `/api/standard-design/requirements/{id}/attachments/{attachmentId}` | 파일과 메타데이터 삭제 |

## 5. LocalStorage Migration 방식

기존 `basekit.standard-design.lifecycle.v1`의 실제 데이터 존재 여부를 프로젝트별로 확인한다. 화면의 `기존 데이터 이관`을 사용자가 실행하면 각 행을 Backend로 전송하고 응답의 `LEGACY_SOURCE_ID`를 확인한다. `(PROJECT_ID, LEGACY_SOURCE_ID)` unique 계약으로 재실행 중복을 방지한다. 원본 LocalStorage는 자동 삭제하지 않으며, 이관 후 화면의 Requirement 원본은 Backend만 사용한다. Dual-write는 없다.

## 6. Backend canonical 전환 이후 데이터 흐름

사용자 입력 → Requirement REST API → Service 검증/메뉴 관계 저장 → MyBatis/Flyway DB가 canonical source가 된다. 첨부는 정책 조회 → `BaseFileUpload`의 XHR multipart transport → 서버 메타데이터/내용 검증 → 파일 저장 및 `BSDRATCH` insert 순서다. 목록·상세·수정·삭제·Preview URL은 Backend API를 사용한다.

## 7. Project/Menu 기존 데이터와의 참조 방식

Project Context는 기존 구조에서 선택한 `PROJECT_ID`를 API에 전달한다. 이번 작업에서 Project DB화는 하지 않는다. Menu 후보는 기존 BaseKit Menu Master/`metadataRepository.getMenus()`에서 표시하고, Requirement에는 `MENU_KEY`만 저장한다. 서버에는 별도 Menu 원본과 물리 FK를 만들지 않는다.

## 8. 공통 업로드 컴포넌트

`frontend/src/components/common/BaseFileUpload.tsx`는 native input, drag & drop, 다중 파일, bounded concurrency(기본 2), 파일별 queued/uploading/completed/failed/canceled 상태, 진행률, 취소, 재시도, 삭제 callback을 제공한다. `frontend/src/services/uploadTransport.ts`는 XHR 진행률과 실제 abort를 담당한다. Requirement 연결은 `requirementUploadTransport.ts`와 `RequirementAttachmentPanel.tsx`가 담당한다. `BaseImagePreview`는 이미지 URL/로컬 blob URL만 표시한다.

브라우저는 0 byte, 중복 이름+크기, 확장자/MIME, 파일당 크기와 최대 개수를 빠르게 거부한다. 서버는 multipart 제한, MIME, 파일 signature/ZIP package/text encoding을 재검증한다. 현재 허용 형식은 png, jpg/jpeg, webp, pdf, txt, docx, xlsx이며 기본 파일당 20MB, 최대 20개다. 설정값으로 변경할 수 있다.

## 9. Test 결과

- `RequirementIntegrationTest`: H2 + Flyway V5에서 생성, 이관 멱등성, 수정, 메뉴 관계, 첨부 업로드/조회/삭제, Requirement 삭제 통과.
- `npm run build`: 통과. Vite가 기존 대형 bundle warning만 표시.
- `npm run lint`: 통과.
- `git diff --check`: 통과.

## 10. 범위 제외

OCR, LLM 분석, 청크/재개 업로드, S3/클라우드 저장소, Project/WBS/Screen/Table Backend 전환은 구현하지 않았다. `ANALYSIS_STATUS`와 별도 Attachment Entity를 통해 후속 분석을 연결할 수 있다.
