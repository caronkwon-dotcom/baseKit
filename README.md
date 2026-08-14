# BaseKit

BaseKit은 여러 SI 업무시스템에서 반복 사용할 표준 아키텍처, 공통 Business Foundation, 개발 생산성 기반을 만드는 프로젝트입니다. 기술 데모보다 실제 적용 가능성, 유지보수성, 확장성과 개발자 이해도를 우선합니다.

초급 개발자도 규약과 가이드를 숙지하면 일관된 화면과 기능을 만들 수 있고, 참여 개발자가 바뀌어도 코드 스타일과 Architecture가 흔들리지 않는 SI 프로젝트 기반을 목표로 합니다.

## 프로젝트 목적

- 업무시스템에서 반복되는 사용자, 권한, 메뉴, 공통코드 관리 구조를 표준화합니다.
- 화면, 타입, mock 데이터를 먼저 정의하여 기능 개발 전 데이터 계약을 명확히 합니다.
- 프론트엔드 화면 구현과 백엔드 API 설계가 같은 용어와 구조를 사용하도록 합니다.
- 개발자의 자유도보다 프로젝트 전체의 일관성과 유지보수성을 우선합니다.
- 초기부터 거대한 범용 Framework, BPM, Rule Engine을 만들지 않고 실제 사용 가능한 범위부터 확장합니다.

## 기술스택

- Frontend: React, Vite, TypeScript, React Router, ESLint
- Backend: Java 21, Spring Boot, Spring MVC, JPA/Hibernate, MyBatis
- Database: PostgreSQL, Flyway
- API 문서: OpenAPI/Swagger UI
- 개발환경: GitHub Codespaces Dev Container

기본 실행 환경은 Node.js 20.19 이상과 npm 10 이상입니다. 현재 도구 호환 범위에서 Node.js 22.12 이상도 지원합니다.

## 처음 확인할 문서

1. [AGENTS.md](AGENTS.md): GPT/Codex 작업 안전 규칙
2. [현재 상태](docs/basekit-current-status.md): 구현·설계·불일치·미결정 및 다음 작업
3. [새 PC 복구 가이드](docs/recovery-guide.md): 설치·검증·작업 재개
4. `docs/01~04`: Architecture, Menu, Permission, Domain 기준
5. `docs/decisions`: 확정된 Architecture Decision
6. `docs/ideas`: 미구현·미확정 아이디어 Backlog

## 브랜치 운영 방식

- `main`: 승인된 안정 버전입니다. 직접 수정하지 않습니다.
- `dev-pm`: 기능을 통합하고 로컬에서 검수하는 개발 브랜치입니다. 직접 수정하지 않습니다.
- `feature/*`, `feat/*`, `fix/*`, `docs/*`, `chore/*`: 실제 작업 브랜치입니다.
- 작업 브랜치는 최신 `dev-pm`을 기준으로 생성하고 PR 대상도 `dev-pm`으로 합니다.
- `dev-pm` 검수와 사용자 승인 후 `dev-pm → main` 승격 PR을 병합합니다.
- Commit, Push, Merge 전에 변경 범위와 검증 결과를 확인합니다.
- 자세한 배경은 [Git 통합 Workflow ADR](docs/decisions/008-git-integration-workflow.md)을 참고합니다.

## 폴더 구조

```text
frontend/src/
  components/   공통 UI 컴포넌트
  constants/    상수 정의
  layouts/      앱 레이아웃
  mock/         화면 개발용 mock 데이터
  pages/        라우트 단위 페이지
  services/     API 연동 서비스
  types/        공통 및 도메인 타입 정의
  utils/        유틸리티 함수
```

주요 Frontend Mock 메타데이터는 `frontend/meta/` 폴더에서 관리합니다.

```text
frontend/meta/
  actions.json
  codes.json
  domains.json
  menus.json
  programs.json
  terms.json
```

현재 React는 `MetadataRepository`를 통해 메타데이터에 접근합니다. 권한은 `ROLE × PROGRAM × ACTION_CODE` 기준이며, 자세한 결정은 [Program Action 권한 및 메타데이터 결정 문서](docs/decisions/007-program-action-permission-metadata.md)를 참고합니다.

## 타입 정의 원칙

- 타입 파일은 `frontend/src/types`에 도메인별로 분리합니다.
- 공통 감사 필드는 `BaseEntity`를 상속해서 사용합니다.
- 사용 여부 값은 `UseYn` 타입을 사용합니다.
- 필드명은 메타데이터, API, DB 컬럼과의 일관성을 위해 대문자 스네이크 케이스를 사용합니다.
- 자세한 결정 배경은 [타입 명명 규칙 결정 문서](docs/decisions/001-type-naming-convention.md)를 참고합니다.

## 날짜/시간 정책

- `*_DT` / `*_AT` 컬럼은 시스템 기준 타임존으로 저장합니다.
- 기본 시스템 기준 타임존은 `Asia/Seoul`이며, 향후 `SYSTEM_TIMEZONE_ID` 설정으로 변경 가능하게 설계합니다.
- 저장 DT 기준 타임존은 최초 설정 후 변경하지 않습니다.
- 화면 표시는 로그인 사용자 또는 업무 기준 `TIMEZONE_ID`에 따라 변환합니다.
- 정렬, 비교, 마감 여부 판단은 저장된 기준 시간으로 처리합니다.
- 자세한 결정 배경은 [날짜/시간 타임존 정책 문서](docs/decisions/002-date-time-timezone-policy.md)를 참고합니다.

## 실행 방법

의존성 설치:

```bash
npm ci --prefix frontend
```

개발 서버 실행:

```bash
npm run dev
```

빌드:

```bash
npm run build
```

린트:

```bash
npm run lint
```

빌드 결과 미리보기:

```bash
npm run preview
```

Backend 개발 서버 실행:

```bash
npm run backend:run
```

Backend 테스트:

```bash
npm run backend:test
```

기본 API 확인:

- Health API: `http://localhost:8080/api/health`
- Actuator: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## Full Stack 디렉터리

```text
frontend/       React + Vite UI와 Frontend Mock Metadata
backend/        Spring Boot REST API
database/       검토 완료된 Flyway Migration
.devcontainer/  Codespaces용 Java + Node + PostgreSQL 환경
```

Codespaces를 생성하면 PostgreSQL이 함께 시작되고 `5173`, `8080`, `5432` 포트가 자동 전달됩니다. Codespaces는 개발·통합검증 환경이며 상시 운영 WAS로 사용하지 않습니다.

현재 실행에 필수인 `.env`나 외부 서비스 인증정보는 없습니다. 비밀키와 Token은 Repository에 저장하지 않습니다.

## 배포

- `dev-pm` 대상 PR: 자동 build 검증
- `main` push: GitHub Pages 배포
- URL: https://caronkwon-dotcom.github.io/baseKit/
