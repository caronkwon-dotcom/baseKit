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

- `main`: 기준 브랜치입니다. 직접 수정하지 않고 항상 안정된 상태를 유지합니다.
- `dev-codex`: Codex 작업 브랜치입니다. `main` 최신 기준에서 생성하거나 최신화한 뒤 작업합니다.
- 작업 시작 전 `main`으로 전환하고 최신 내용을 pull 합니다.
- 기능 작업은 `dev-codex`에서만 수행합니다.
- 작업 완료 후 변경 범위와 commit message를 보고합니다.

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

## 타입 정의 원칙

- 타입 파일은 `src/types`에 도메인별로 분리합니다.
- 공통 감사 필드는 `BaseEntity`를 상속해서 사용합니다.
- 사용 여부 값은 `UseYn` 타입을 사용합니다.
- 필드명은 메타데이터, API, DB 컬럼과의 일관성을 위해 대문자 스네이크 케이스를 사용합니다.
- 자세한 결정 배경은 [타입 명명 규칙 결정 문서](docs/decisions/001-type-naming-convention.md)를 참고합니다.

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
