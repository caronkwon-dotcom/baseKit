# 008. Git Integration Workflow

## 상태

Accepted

## 배경

BaseKit은 Windows GPT Work와 WSL/IntelliJ 환경에서 작업할 수 있다. 두 로컬 Repository를 직접 동기화하면 변경 유실과 충돌 위험이 있으므로 GitHub를 중앙 저장소로 사용한다.

## 결정

```text
latest dev-pm
  → feature branch
  → dev-pm PR
  → 자동 build
  → dev-pm 병합
  → 로컬 검수
  → 사용자 승인
  → dev-pm → main 승격 PR
  → GitHub Pages 배포
```

- `main`과 `dev-pm`에 직접 Commit하지 않는다.
- 기능, 문서, 수정은 독립 branch에서 수행한다.
- feature PR의 base는 `dev-pm`이다.
- 사용자 승인 없이 Merge하지 않는다.
- `main`은 승인된 안정 버전과 배포 기준이다.
- Windows와 WSL clone은 GitHub를 통해서만 변경을 교환한다.
- 중요한 변경은 로컬 Commit으로만 남기지 않고 원격 branch와 PR에 보존한다.

## 검증

`dev-pm` 대상 PR은 GitHub Actions에서 dependency 설치와 build를 검증한다. 실제 Pages 배포는 `main`에서만 수행한다.

## 영향

- 진행 중 작업은 GitHub의 branch와 PR에서 복구할 수 있다.
- `dev-pm`은 통합·검수 branch, `main`은 최종 승인 branch로 역할이 분리된다.
- PC 장애 시 Repository clone과 PR 확인으로 작업을 재개할 수 있다.
