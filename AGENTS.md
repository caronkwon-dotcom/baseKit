# BaseKit Agent Working Agreement — BK-WORKFLOW-001

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
- 검증 완료 후 사용자 또는 작업지시서에서 각각 승인한 경우에만 지정된 작업 branch에 commit/push한다.
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

최신 `origin/dev-pm`을 확인하고 아래 안전 동기화 절차와 승인 범위에 따라 작업 기준을 동기화한다. 충돌 또는 불명확한 변경이 있으면 임의로 해결하지 않는다.

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

PLAN의 설계 이해 목록과 구현 계획을 보고하고 사용자 또는 설계자의 승인을 받은 뒤 ACT로 전환한다. 기존 승인 범위가 명확한 경우 그 승인을 적용하되, 추가 설계 결정은 별도 승인을 받는다.

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

검증 완료 후 사용자 또는 작업지시서에서 commit/push를 각각 승인한 경우에만 `common-work`로 수행한다. 구현 승인이나 PR 생성 승인을 commit/push/Merge 전체 승인으로 확대 해석하지 않는다.

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

## 7. BK-WORKFLOW-001 — origin/dev-pm 안전 동기화

- 지정된 기존 worktree와 branch를 유지한다. 경로나 branch가 다르면 중단하고 보고한다.
- `git status`, 현재 branch, remote, 관련 열린 PR 및 진행 중인 Merge/Rebase/Cherry-pick 상태를 확인한다.
- `git fetch origin`으로 원격 참조를 최신화한다. fetch는 작업 branch에 변경을 반영하는 승인이 아니다.
- fetch 실패 시 로컬 원격 추적 참조를 최신이라고 표시하지 않고 실패 원인과 확인 한계를 보고한다.
- HEAD와 `origin/dev-pm`의 기준 SHA, 포함 관계, 변경 파일 및 충돌 가능성을 검토한다.
- 미커밋 변경이나 진행 중인 Git 작업이 있으면 자동 병합하지 않는다. 사용자 파일을 임의 stash/reset/삭제하지 않는다.
- 안전한 상태와 사용자 또는 작업지시서의 동기화 승인이 모두 확인된 경우에만 `origin/dev-pm`을 작업 branch에 반영한다. 승인 없이 merge/rebase/cherry-pick/pull을 실행하지 않는다.
- 충돌이나 불명확한 변경은 자동 해결하거나 한쪽 내용으로 덮지 않고 보고한다. 기존 기능을 임의로 버리지 않는다.
- 실제 동기화 수행 여부, 결과와 기준 Commit SHA를 보고한다. 이미 포함된 경우와 미수행·실패를 구분한다.
- 강제 Push, 무단 Reset, 무단 Merge, branch 삭제를 금지한다.

## 8. BK-WORKFLOW-001 — 설계 이해 목록

작업지시를 받은 즉시 구현하지 않고 PLAN에서 다음을 목록화한다.

1. 이해한 요구사항
2. 기존 구현과의 차이 및 충돌
3. 신규·수정·삭제 예정 파일
4. 구현자가 가정한 내용
5. 설계자 확인 및 승인이 필요한 사항
6. 기존 기능에 대한 영향과 위험

확인이나 승인이 필요한 설계 사항은 임의로 결정하지 않는다. 승인된 범위만 변경하며 기존 기능을 임의 삭제하거나 원복하지 않는다.

설계 이해 목록과 중간 산출물은 지정된 workroom의 tasks/reports에서 관리하고 제품 Repository에 미승인 설계 문서를 넣지 않는다. CURRENT.md가 없거나 접근할 수 없으면 임의 생성하거나 TASK/ROLE을 추측하지 않고 보고한다.

## 9. BK-WORKFLOW-001 — PR, PM 통합 및 완료 보고

- commit, push, PR 생성은 각각 사용자 또는 작업지시서가 승인한 범위에서만 수행한다. 승인되지 않은 단계는 미수행으로 보고한다.
- PR 생성이 승인되면 지정된 작업 branch에서 `dev-pm`을 대상으로 생성하거나 기존 관련 PR을 갱신한다. 기존 PR을 확인하여 중복 생성하지 않는다.
- PR에는 설계 이해 목록, 변경 파일과 변경사항, 검증 결과, 위험 및 미완료 사항을 기록한다.
- 제품 코드와 작업지시·검수 문서의 commit을 분리하고, PM이 검토할 제품 반영 대상 SHA를 명시한다.
- 기존 `docs/basekit-branch-integration-rules.md`의 제품 commit 선택 통합 원칙을 유지한다. PR 생성은 branch 전체 Merge 또는 Merge 승인을 의미하지 않는다.
- 개발 AI는 `dev-pm`에 직접 Push하거나 Merge하지 않는다. PM만 PR을 검토하고 승인 범위에서 통합한다. IntelliJ의 PR 검토 기능을 사용할 수 있다.
- `dev-pm` 로컬 검수 후 `dev-pm → main` 승격 PR도 사용자 승인 후 PM이 병합한다.
- 통합 여부와 기준 SHA를 실제로 확인하기 전에는 제품 반영 또는 통합 완료로 보고하지 않는다.
- 완료 시 작업 branch, 변경 파일, 검증 결과와 실행하지 못한 이유, 미완료·위험, Commit SHA, push 결과, PR 번호/URL, dev-pm 반영 여부를 해당 단계의 수행 여부와 함께 보고한다.
- 작업 보고서는 `G:\CARON\basekit-workroom\common\reports\`에 남기고, 확정 결정은 ADR/Architecture, 구현 상태와 다음 작업은 `docs/basekit-current-status.md`, 미승인 아이디어는 `docs/ideas/`에 반영한다. 중간 및 종료 시 context 문서 누락을 점검한다.
- 다음 작업 시작 시 다시 최신 `origin/dev-pm`과 실제 통합 상태를 확인한다. 동기화·Push·PR 생성 실패를 성공으로 보고하지 않는다.

이 통합 규칙은 기존 Architecture/ADR, COMMON worktree/branch 고정, workroom 분리 및 PLAN 승인 규칙을 유지하며, 자동 동기화·무조건 commit/push/PR로 해석될 수 있는 문구보다 명시적 승인과 안전 조건을 우선한다.
