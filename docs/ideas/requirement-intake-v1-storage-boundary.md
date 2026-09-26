# 요구사항 접수 V1 저장 경계 검토

상태: 승인됨 / ADR-031로 이동 / 구현 진행

확정 위치: [ADR-031](../decisions/031-requirement-intake-backend-boundary.md)

기준: 2026-09-26, origin/dev-pm 426811f. 작업 branch: codex/requirement-intake-v1. 열린 PR 없음.

## 현재 구조

- `frontend/src/modules/standard-design/design-lifecycle/designLifecycle.repository.ts`는 프로젝트·요구사항·WBS·화면·테이블을 LocalStorage에 저장한다. 요구사항 Backend/API/DB는 없다.
- ADR-027 Lifecycle Foundation은 DB Adapter와 운영 주체 결정 전 브라우저 JSON 저장을 명시한다.
- 메뉴관리는 `metadataRepository.getMenus()`를 사용한다. 원본은 `frontend/meta/menus.json`과 Module Manifest이며 메뉴 Backend Master/API는 없다. 식별자는 `menuKey`다.
- 공통 업로드 구현은 없다. Uploader Adapter는 설계 단계다.
- 공통코드 Backend/MyBatis/JPA 및 Flyway V1~V4는 구현되어 있다. Migration은 기존 파일 수정 없이 순차 추가한다.
- 요구사항 Program은 기존 Manifest의 `SD_REQUIREMENT_DESIGN`, `/standard-design/requirements`와 프로젝트 Context Guard를 사용한다.

## 문제

작업지시는 Backend canonical data, 서버 자동 ID, 실제 복수 첨부를 요구한다. 기존 LocalStorage Adapter를 그대로 확장하면 이 원칙을 충족하지 못한다. 반대로 프로젝트·메뉴까지 DB화하면 요청 범위를 초과한다. 기존 브라우저 데이터는 서버가 자동으로 발견할 수 없고, 브라우저 간 같은 프로젝트/요구사항 ID 충돌 가능성도 있다.

## 선택지

1. 기존 브라우저 저장 유지: 변경은 작지만 Backend canonical 원칙에 어긋나므로 권고하지 않는다.
2. 요구사항·관련 메뉴 관계·첨부만 Backend로 전환: 요청 기능을 충족하면서 기존 Lifecycle의 전면 전환을 피한다. 프로젝트 참조와 기존 데이터 이관은 명시적 계약이 필요하다.
3. 프로젝트·메뉴를 포함해 전체 Lifecycle DB 전환: 정합성 경계가 명료해지지만 이번 작업 범위를 넘으므로 별도 과제로 분리한다.

## 추천안 — 선택지 2, 승인 필요

- 요구사항 CRUD, ID 생성, N:M 메뉴 연결, 첨부 메타데이터를 서버에서 관리한다. 상태는 DRAFT/IN_PROGRESS/REVIEW/APPROVED를 유지한다. 요구 유형은 기존 공통코드 그룹으로 제공한다.
- 프로젝트는 기존 Context의 PROJECT_ID를 논리 참조한다. 현재 서버가 프로젝트 존재·소유권을 검증할 수 없다는 한계를 문서화한다. 별도 Project Master를 이번 작업에서 생성하지 않는다.
- 메뉴는 기존 menuKey를 API의 MENU_KEY로 전달해 관계 테이블에 저장한다. 기존 메뉴 Repository의 동일 원본을 재사용하며 새로운 메뉴 Master를 만들지 않는다. 서버 메뉴 검증 Adapter의 원본 공급 계약을 구현 설계에서 명시한다.
- 첨부는 설정 가능한 서버 로컬 디렉터리에 불투명 Storage Key로 저장하고 DB에 메타데이터를 기록한다. 외부 Storage 서비스나 Viewer 라이브러리는 추가하지 않는다. 업로드 실패 정리와 경로 검증, 크기 제한, 다운로드 응답 헤더를 포함한다.
- 기존 LocalStorage는 지우거나 조용히 서버에 덮어쓰지 않는다. 서버 전환 전 기존 데이터의 명시적 이관 경로를 제공한다. 서버가 새 식별자를 발급하고 기존 ID와의 매핑을 보존하며, 충돌·프로젝트 대응 관계를 확인한다. 기존 WBS_IDS/SCREEN_IDS/TABLE_IDS는 입력 UI에서만 제외하고 이관 중 보존한다.
- 프로젝트 참조 및 이관 정책 승인 전에는 Backend/DB 변경을 확정하거나 기존 저장 경로를 교체하지 않는다.

## 영향범위와 UI 구현안

- 프로젝트 `ProjectListDetailWorkspace`와 `projectSplitter.ts`를 재사용한다. 기본 30:70, 최소 목록 360px/상세 480px, Splitter 12px, 접기/펼치기 및 키보드 Resize를 유지한다. 재사용을 위한 명칭/접근성 label만 일반화하고 중복 Splitter를 만들지 않는다.
- `PageHeader`, `ActionButton`, `SearchPanel`, `BaseKitMessage`, 기존 Grid/Form 규칙을 재사용한다. 요구사항 전용 디자인 체계는 만들지 않는다.
- 기본정보: 서버 발급 읽기 전용 ID, 이름, 공통코드 유형, 기존 메뉴 복수 선택, 요구사항 설명, 프로세스 설명, 기존 상태.
- 첨부 1:N: ATTACHMENT_ID, REQUIREMENT_ID, ORIGINAL_FILE_NAME, STORAGE_KEY, FILE_TYPE, MIME_TYPE, FILE_SIZE, UPLOAD_DT, ANALYSIS_STATUS. 분석 결과는 향후 별도 결과 모델로 연결한다.
- 이미지 PNG/JPEG/WEBP는 API로 읽어 브라우저 기본 이미지 표시를 사용한다. 비이미지는 파일 정보와 다운로드를 제공한다.
- CRUD와 분리된 상세 영역에 향후 AI 분석 확장 위치만 확보한다. OCR/LLM API/Process Diagram은 구현하지 않는다.
- 향후 관계 추천은 Suggestion → User Review → Confirm → Design Asset을 따른다. Process는 Node/Relation 데이터에서 렌더링하며 이미지 자체를 원본으로 삼지 않는다.
- Traceability는 입력이 아닌 설계 결과다. 기존 연결값은 보존한다.

## 승인 후 검증 및 완료 보고

서버 CRUD·메뉴 관계·파일 업로드/조회·삭제·기존 데이터 이관 회귀와 UI 신규/수정/삭제, 이미지 미리보기, 프로젝트 전환, 미저장 보호, Splitter 최소 폭을 검증한다. 기본 명령은 npm run build, npm run lint, npm run backend:test, git diff --check다. 완료 시 작업지시의 14개 보고 항목에 맞춰 파일, Migration, API, 모델, 재사용 컴포넌트, 호환성, 검증 결과와 화면 확인 동선을 기록한다.

승인 후 확정 결정은 ADR로 이동하고 이 문서에 이동 위치를 남긴다. 현재는 코드 완료로 표시하지 않는다.
