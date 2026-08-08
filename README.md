# BaseKit

BaseKit은 업무시스템 개발을 위한 React 기반 참조 아키텍처 프로젝트입니다. 공통 메타데이터, 타입 정의, mock 데이터, 화면 구조를 일관된 방식으로 관리하여 이후 API, DB, UI 구현의 기준점을 제공합니다.

## 프로젝트 목적

- 업무시스템에서 반복되는 사용자, 권한, 메뉴, 공통코드 관리 구조를 표준화합니다.
- 화면, 타입, mock 데이터를 먼저 정의하여 기능 개발 전 데이터 계약을 명확히 합니다.
- 프론트엔드 화면 구현과 백엔드 API 설계가 같은 용어와 구조를 사용하도록 합니다.
- 개발자의 자유도보다 프로젝트 전체의 일관성과 유지보수성을 우선합니다.

## 기술스택

- React
- Vite
- TypeScript
- React Router
- ESLint

## 브랜치 운영 방식

- `main`: 승인된 안정 버전입니다. 직접 수정하지 않습니다.
- `dev-pm`: 기능을 통합하고 로컬에서 검수하는 개발 브랜치입니다. 직접 수정하지 않습니다.
- `feature/*`, `feat/*`, `fix/*`, `docs/*`, `chore/*`: 실제 작업 브랜치입니다.
- 작업 브랜치는 최신 `dev-pm`을 기준으로 생성하고 PR 대상도 `dev-pm`으로 합니다.
- `dev-pm` 검수와 사용자 승인 후 `dev-pm → main` 승격 PR을 병합합니다.
- Commit, Push, Merge 전에 변경 범위와 검증 결과를 확인합니다.

## 폴더 구조

```text
src/
  components/   공통 UI 컴포넌트
  constants/    상수 정의
  layouts/      앱 레이아웃
  mock/         화면 개발용 mock 데이터
  pages/        라우트 단위 페이지
  services/     API 연동 서비스
  types/        공통 및 도메인 타입 정의
  utils/        유틸리티 함수
```

주요 메타데이터는 `meta/` 폴더에서 관리합니다.

```text
meta/
  actions.json
  codes.json
  domains.json
  menus.json
  programs.json
  terms.json
```

현재 React는 `MetadataRepository`를 통해 메타데이터에 접근합니다. 권한은 `ROLE × PROGRAM × ACTION_CODE` 기준이며, 자세한 결정은 [Program Action 권한 및 메타데이터 결정 문서](docs/decisions/007-program-action-permission-metadata.md)를 참고합니다.

## 타입 정의 원칙

- 타입 파일은 `src/types`에 도메인별로 분리합니다.
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
npm install
```

개발 서버 실행:

```bash
npm run dev
```

빌드:

```bash
npm run build
```

빌드 결과 미리보기:

```bash
npm run preview
```
