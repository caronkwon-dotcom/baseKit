# BaseKit Agent Working Agreement

이 Repository에서 작업하는 GPT/Codex Agent는 다음 규칙을 따른다.

## 작업 시작

1. `git status`, 현재 branch, remote와 관련 PR을 확인한다.
2. `README.md`, `docs/basekit-current-status.md`, 관련 Architecture 문서와 ADR을 읽는다.
3. 대화나 과거 branch보다 현재 Repository 상태를 우선한다.
4. 코드 구현, 문서 설계, 불일치, 미결정 상태를 구분한다.

## Git 규칙

- `main`과 `dev-pm`에서 직접 작업하지 않는다.
- 최신 `dev-pm`에서 기능별 작업 branch를 생성한다.
- 작업 PR 대상은 `dev-pm`이다.
- `dev-pm`에서 로컬 검수 후 사용자 승인으로 `dev-pm → main` 승격 PR을 병합한다.
- 사용자 승인 없이 Merge하거나 branch를 삭제하지 않는다.
- 다른 작업자의 변경과 미커밋 파일을 보존한다.
- 관련 없는 변경을 같은 Commit이나 PR에 포함하지 않는다.

## 설계 및 구현 규칙

- 큰 구조 변경은 `현재 구조 → 문제 → 선택지 → 추천안 → 영향범위` 순서로 먼저 보고한다.
- 최종 Architecture와 큰 정책 결정은 사용자가 승인한다.
- BaseKit은 기술 데모가 아니라 실제 SI 프로젝트에서 반복 사용할 Foundation이다.
- 과도한 추상화보다 적용 가능성, 유지보수성, 개발자 이해도와 재사용성을 우선한다.
- 도메인·API·DTO·Mock 필드는 `SCREAMING_SNAKE_CASE`, UI 내부 상태·props·handler는 camelCase를 허용한다.
- Menu는 탐색, Program은 실행·MDI·권한 단위, Action은 Program 내부 업무 행위다.
- 권한은 `ROLE × PROGRAM × ACTION_CODE`를 기준으로 한다.
- 확정된 중요 결정은 관련 문서나 `docs/decisions`에 반영한다.

## 검증 및 보고

- 기본 검증은 `npm run build`, `npm run lint`, `git diff --check`다.
- 기능 변경 시 안전한 범위에서 실제 동작을 추가 검증한다.
- 작업 종료 시 코드와 문서의 상태를 동기화한다.
- Commit, Push, PR 시 변경 범위와 검증 결과를 간결하게 보고한다.
- 비밀키, Token, 계정정보를 Repository에 저장하지 않는다.

## Context 영속화

- 작업 중 확정된 중요한 철학, 정책, 설계와 제약은 대화에만 남기지 않는다.
- 확정 결정은 ADR 또는 관련 Architecture 문서에 반영한다.
- 구현 상태와 다음 작업은 `docs/basekit-current-status.md`에 반영한다.
- 아직 승인·구현되지 않은 아이디어는 `docs/ideas/`에 분리하고 코드 완료로 표시하지 않는다.
- 아이디어가 승인되면 관련 ADR/WBS로 이동하고 원래 문서에 상태와 이동 위치를 남긴다.
- 작업 중간과 종료 시 문서 누락 여부를 확인한다.
