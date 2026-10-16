# BaseKit 브랜치 통합 운영 원칙

작성일: 2026-10-05
대상: `dev-pm`, `common-work`, `design-work`, `sd-work` 및 BaseKit 관련 작업방

## 1. 목적

BaseKit은 COMMON / DESIGN / SD가 병렬로 작업하되, 제품 통합 기준은 항상 `dev-pm`으로 유지한다.

팀 브랜치에 여러 작업을 장기간 누적한 뒤 한 번에 merge하면 다음 문제가 발생할 수 있다.

- 동일 파일을 여러 팀이 수정하여 충돌 증가
- 최신 `dev-pm` 반영 시점 차이로 인한 화면/코드 원복
- 동일 기능이 다른 SHA로 재구현되어 반영 여부 추적 곤란
- 문서 commit과 제품 코드 commit이 함께 섞여 불필요한 merge 발생
- 팀 브랜치에 `dev-pm` merge commit이 반복되어 히스토리 복잡화

따라서 BaseKit은 **작업 단위 즉시 통합**을 기본 원칙으로 한다.

## 2. Source of Truth

- 제품 통합 기준 브랜치: `dev-pm`
- COMMON 작업 브랜치: `common-work`
- DESIGN 작업 브랜치: `design-work`
- SD 작업 브랜치: `sd-work`

`dev-pm`이 제품 상태의 단일 기준(SoT)이다.

각 작업방은 자기 브랜치 상태만 보고 제품 반영 여부를 판단하지 않는다.

## 3. 작업 시작 전

모든 작업방은 작업 시작 전에 최신 `origin/dev-pm`을 기준으로 현재 차이를 확인한다.

원칙:

1. 현재 작업 브랜치의 clean 여부 확인
2. `origin/dev-pm` 최신화
3. 현재 작업이 최신 `dev-pm`과 충돌하거나 이미 반영된 내용인지 확인
4. 기존 구현을 원복하거나 중복 구현하지 않도록 현행 코드를 먼저 검수

장기 작업 브랜치에 `dev-pm` merge commit을 반복해서 쌓는 방식은 피한다.

가능하면 작업 단위가 끝난 뒤 즉시 제품에 통합하고 다음 작업을 시작한다.

## 4. Commit 단위

작업은 기능 단위로 작게 commit한다.

### 반드시 분리

- 제품 코드 commit
- DESIGN / COMMON / SD 작업지시 및 검수 문서 commit

예:

```text
fix(ui): align requirement form labels
fix(ui): refine shared combo popup
docs(design): record requirement form verification
```

제품 코드와 문서를 하나의 commit으로 묶지 않는다.

## 5. dev-pm 반영 원칙

### 기본 원칙

팀 브랜치 전체 merge를 기본 반영 방식으로 사용하지 않는다.

작업 완료 후 제품에 필요한 commit SHA를 명시하고, 해당 제품 commit만 `dev-pm`에 선택적으로 반영한다.

권장:

```text
팀 작업 완료
→ 제품 commit SHA 확인
→ dev-pm 즉시 통합
→ build/lint/test
→ 다음 작업 시작
```

### 문서 처리

- DESIGN 검수 문서: `design-work` 유지 가능
- COMMON 작업 기록: `common-work` 유지 가능
- SD 설계/검토 문서: `sd-work` 유지 가능
- 제품 운영상 반드시 필요한 문서만 별도 판단 후 `dev-pm`에 반영

## 6. 팀별 기준

### COMMON

- 공통 컴포넌트 / 공통 CSS / 공통 API 표현 변경은 기능 단위 commit
- 완료 즉시 제품 commit을 `dev-pm`에 통합
- 다른 팀 작업을 기다리며 공통 변경을 장기간 누적하지 않는다

### DESIGN

- 프로토타입 / 작업지시 / 검수 기록과 실제 UI 코드를 분리 commit
- 실제 JSX / CSS / renderer 등 제품 UI commit만 `dev-pm`에 통합
- DESIGN 브랜치 전체 merge로 제품을 반영하지 않는다

### SD

- 요구사항 / 프로세스 / 화면 / DB 등 업무 기능 코드와 설계 문서를 분리
- 제품 기능 commit만 `dev-pm`에 즉시 통합
- 다른 팀 공통 변경이 필요하면 먼저 최신 `dev-pm` 상태를 확인한다

### 검수 / Merge 작업방

- 브랜치 전체 merge보다 반영 대상 SHA 목록을 명시적으로 관리
- 이미 `dev-pm`에 동일 변경이 다른 SHA로 들어갔는지 먼저 확인
- commit message만 보고 중복 여부를 판단하지 말고 필요 시 diff/file 단위로 확인
- 중복 cherry-pick 금지

## 7. 통합 후 검증

제품 commit을 `dev-pm`에 통합한 직후 검증한다.

기본 검증:

```text
build
lint
frontend test
필요 시 backend test
실제 화면 browser 검수
```

검증이 끝나기 전에 다음 관련 작업을 시작하지 않는 것을 원칙으로 한다.

## 8. 충돌 발생 시

충돌이 발생하면 한쪽을 기계적으로 선택하지 않는다.

확인 순서:

1. 현재 `dev-pm`에서 이미 개선된 내용 확인
2. cherry-pick 대상 commit의 실제 목적 확인
3. 두 의도를 합쳐야 하는지 판단
4. 충돌 marker 제거
5. build/lint/test 수행
6. 중복 반영 여부 재확인

충돌 해결 중 다음 commit으로 넘어가지 않는다.

## 9. 완료 회신 표준

각 작업방은 완료 시 아래를 명확히 남긴다.

```text
- 작업 브랜치
- 제품 코드 commit SHA
- 문서 commit SHA (있는 경우)
- 변경 파일
- dev-pm 반영 여부 / dev-pm SHA
- build/lint/test 결과
- browser 검수 결과
- 남은 리스크 또는 다른 팀 협의사항
```

`작업 완료`라고만 보고하지 않는다.

## 10. 금지 사항

- 여러 기능을 팀 브랜치에 장기간 쌓은 뒤 한꺼번에 merge
- 문서와 제품 코드를 구분하지 않은 대형 commit
- `dev-pm`에 이미 반영된 기능을 다른 SHA로 다시 cherry-pick
- 현재 코드 확인 없이 과거 SHA를 무조건 복구
- 충돌 marker가 남은 상태에서 build 또는 다음 cherry-pick 진행
- 팀 브랜치의 최신 상태를 제품 최신 상태로 간주

## 11. 핵심 한 줄

> **BaseKit은 `dev-pm`을 제품 SoT로 두고, 각 팀의 제품 commit을 작업 완료 즉시 작은 단위로 선택 통합한다. 문서와 제품 코드는 분리하며, 브랜치 전체 merge는 예외적으로만 사용한다.**
