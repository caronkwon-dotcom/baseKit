# BaseKit 현재 상태와 WBS

이 문서는 새 작업자와 GPT Work가 실제 Repository 상태를 빠르게 파악하기 위한 기준 문서다. 특정 날짜나 과거 작업 branch가 아니라 최신 `dev-pm`과 열린 PR을 기준으로 갱신한다.

## 1. 프로젝트 단계

BaseKit은 Frontend Prototype을 기반으로 Spring REST와 실제 DB Foundation을 함께 확장하는 Full Stack 단계다. Admin Shell과 공통 관리 화면 패턴을 유지하면서 시스템 공통 V1의 API·DB 계약을 구체화한다.

목표는 여러 SI 프로젝트에서 반복 사용할 수 있는 다음 기반이다.

- 표준 Architecture
- 공통 Infrastructure/Business Foundation
- 개발 생산성 기준
- 코드와 문서가 함께 유지되는 작업 방식

현재는 **Level 1: 시스템 공통 Foundation** 단계다. 초급 개발자도 가이드와 규약을 따르면 일관된 화면과 코드를 만들 수 있고, 개발자 변경에도 프로젝트 스타일이 흔들리지 않는 기반을 목표로 한다.

## 2. 코드까지 구현 완료

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
- Standard Design `Screen Design Schema v0.1`과 저장·검증 계약
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

- Standard Design `Screen Design Schema v0.1`
- 설계 대상 시스템의 Menu·Role·Program Metadata와 BaseKit Runtime 권한의 명확한 분리

## 8. 다음 추천 작업

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
