# BaseKit Agent Working Agreement

이 Repository에서 작업하는 GPT/Codex Agent는 다음 규칙을 따른다.

## 작업 시작

1. `git status`, 현재 branch, remote와 관련 PR을 확인한다.
2. `README.md`, `docs/basekit-current-status.md`, 관련 Architecture 문서와 ADR을 읽는다.
3. 대화나 과거 branch보다 현재 Repository 상태를 우선한다.
4. 코드 구현, 문서 설계, 불일치, 미결정 상태를 구분한다.

## Git 규칙

- `main`과 `dev-pm`에서 직접 작업하지 않는다.
- 작업 시작 시 지정된 기존 worktree와 branch를 확인한다.
- 신규 branch/worktree는 생성하지 않는다.
- 최신 dev-pm 변경사항은 확인하되, 작업 branch 반영은 충돌 여부를 검토한 후 진행한다.
- 구현 완료 후 지정된 작업 branch에 commit/push한다.
- dev-pm 통합은 PM 승인 후 별도 단계에서 진행한다.
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

- 기본 검증은 `npm run build`, `npm run lint`, `npm run backend:test`, `git diff --check`다.
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

# BaseKit Agent Working Agreement — COMMON 추가 규칙

## 1. 작업 환경 고정

현재 COMMON 개발 환경은 다음과 같다.

- 작업 디렉토리: `G:\CARON\basekit\common`
- 작업 브랜치: `common-work`
- 통합 기준 브랜치: `dev-pm`

작업 시작 전 반드시 실제 디렉토리와 브랜치를 확인한다.

경로나 브랜치가 일치하지 않으면 즉시 중단하고 사용자에게 보고한다.

- 신규 branch 생성 금지
- 신규 worktree 생성 금지
- 기존 branch 이름 변경 금지
- 임의 checkout 금지
- `main` 및 `dev-pm` 직접 수정 금지
- 다른 작업자의 변경사항과 미커밋 파일 보존

최신 `dev-pm`을 확인하고 작업 기준을 동기화한다. 충돌 또는 불명확한 변경이 있으면 임의로 해결하지 않는다.

## 2. 작업지시서 프로토콜

작업지시 및 중간 산출물은 제품 Repository와 분리한다.

**작업지시서 위치**

`G:\CARON\basekit-workroom\common\tasks\`

**작업 보고서 위치**

`G:\CARON\basekit-workroom\common\reports\`

작업 시작 시 `G:\CARON\basekit-workroom\CURRENT.md`가 존재하는지 확인한다.

존재하면 해당 문서가 지정한 TASK/ROLE을 읽고 작업한다.

해당 파일이 없거나 접근할 수 없으면 임의 생성하거나 다른 지시서를 추측하지 않고 보고한다.

작업지시서 및 미승인 설계 문서는 실제 제품 Repository에 커밋하지 않는다.

승인된 최종 산출물만 제품 Repository에 반영한다.

## 3. PLAN / ACT

PLAN 모드에서는 다음만 수행한다.

- 작업 환경 확인
- 작업지시서 확인
- 기존 소스 분석
- 영향 범위 파악
- 구현 계획 보고

ACT 모드에서는 승인된 작업 범위만 구현한다.

작업지시서에 명시되지 않은 기능을 임의로 확장하지 않는다.

## 4. 구현 및 검증

기존 BaseKit 공통 컴포넌트, CSS, Grid, Form, Toolbar, Modal 규격을 우선 적용한다.

기존 Repository의 Architecture/ADR 및 데이터 계약을 준수한다.

기본 검증:

- `npm run build`
- `npm run lint`
- `npm run backend:test`
- `git diff --check`

실행 가능하지 않은 검증은 그 이유를 보고한다.

## 5. Commit / Push

검증 완료 후 작업지시서에서 승인한 경우에만 `common-work`로 commit/push한다.

- `dev-pm` 직접 merge 금지
- 새로운 PR 임의 생성 금지
- 관계없는 변경을 같은 commit에 포함하지 않는다
- Commit SHA 및 push 결과 보고

작업 완료 후 추가 기능을 임의 개발하지 않고 대기한다.

## 6. 기존 BaseKit 규칙 유지

기존 AGENTS.md의 다음 규칙은 그대로 유지한다.

- Architecture 및 ADR 준수
- Menu / Program / Action 책임 분리
- 권한 체계
- 코드 네이밍 규칙
- 데이터 및 비밀정보 보호
- 검증 및 현황 문서 관리

본 COMMON 작업 규칙과 기존 Git 규칙이 충돌하면 **현재 지정된 기존 worktree/branch 고정 규칙을 우선한다.**