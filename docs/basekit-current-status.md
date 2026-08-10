# BaseKit 현재 상태와 WBS

이 문서는 새 작업자와 GPT Work가 실제 Repository 상태를 빠르게 파악하기 위한 기준 문서다. 특정 날짜나 과거 작업 branch가 아니라 최신 `dev-pm`과 열린 PR을 기준으로 갱신한다.

## 1. 프로젝트 단계

BaseKit은 React Frontend First 단계다. Admin Shell과 공통 관리 화면 패턴을 먼저 만들고, 향후 Spring REST와 실제 DB로 확장한다.

목표는 여러 SI 프로젝트에서 반복 사용할 수 있는 다음 기반이다.

- 표준 Architecture
- 공통 Infrastructure/Business Foundation
- 개발 생산성 기준
- 코드와 문서가 함께 유지되는 작업 방식

현재는 **Level 1: 시스템 공통 Foundation** 단계다. 초급 개발자도 가이드와 규약을 따르면 일관된 화면과 코드를 만들 수 있고, 개발자 변경에도 프로젝트 스타일이 흔들리지 않는 기반을 목표로 한다.

## 2. 코드까지 구현 완료

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
- `meta/*.json` 기반 Metadata Repository
- Program Component Registry
- `ROLE × PROGRAM × ACTION_CODE` 계약과 `hasAction()` 기반
- Program/Menu/Action 참조 및 메뉴 최대 3Depth 검증
- GitHub Pages main 배포
- dev-pm 대상 PR 자동 build
- 행정안전부 공공표준용어 13,176건 조회·검색·페이징과 항목별 정제 Workbench
- 공공표준 원본과 BaseKit 정제 결과 분리
- 로컬 개발환경 `meta/term-curation.json` 안전 저장 및 정적 배포 브라우저 임시저장·JSON 내보내기

## 3. 문서만 설계 완료

- Spring REST와 실제 DB 연동
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
- 채택 승격, 단어사전, 도메인 검증, DDL 생성은 후속 작업

## 8. 다음 추천 작업

표준용어 정제 화면을 검수한 뒤 채택 기준과 단어·용어·도메인 관리 모델을 확정한다. 이후 WBS 2 로그인 권한 Context와 WBS 3 시스템관리 기준 화면을 진행하며, 용어 Foundation이 신규 테이블·API 명명 기준을 제공하도록 연결한다.

연말까지의 목표는 Level 1 시스템 Foundation의 핵심 규약, 기준 화면, 개발자 가이드와 Frontend 공통 구조를 실제 다음 SI 프로젝트에서 시작점으로 사용할 수 있는 수준까지 확보하는 것이다. 주간 목표는 이 목표에 기여하는 작은 검증 단위로 나눈다.

## 9. 갱신 규칙

- 기능 PR이 `dev-pm`에 병합될 때 관련 상태를 갱신한다.
- 완료된 작업은 WBS에서 제거하지 않고 구현 완료 영역으로 이동한다.
- 일시적인 로그, 대화 원문, 특정 작업자 지시는 기록하지 않는다.
- PR 번호는 진행 중 확인에 꼭 필요한 경우만 일시적으로 기록한다.
- 미구현 아이디어는 구현·설계 완료 항목과 섞지 않고 `docs/ideas/`에서 상태별로 관리한다.
- 아이디어가 승인되면 관련 ADR, Architecture 문서와 WBS로 이동한다.
- 주간 작업 종료 시 완료 내용, 남은 문제, 다음 주 목표를 갱신한다.
