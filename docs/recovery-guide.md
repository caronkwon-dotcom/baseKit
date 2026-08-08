# BaseKit 새 PC 복구 가이드

## 1. 필수 도구

- Git
- Node.js 20.19 이상 LTS (`.nvmrc` 기준)
- npm
- GitHub CLI (`gh`): PR 작업 시 필요

비밀번호, Token, 외부 서비스 인증정보는 Repository가 아닌 별도 보안 저장소에서 복구한다.

## 2. Repository 복구

```powershell
git clone https://github.com/caronkwon-dotcom/baseKit.git
cd baseKit
git fetch origin --prune
git switch -c dev-pm --track origin/dev-pm
```

기본 clone은 `main`을 checkout한다. 개발 재개 전 `dev-pm`과 진행 중 PR을 반드시 확인한다.

## 3. Dependency 및 기본 검증

```powershell
node --version
npm --version
npm ci
npm run build
npm run lint
git status
```

정상 기준:

- Node.js 20.19 이상
- dependency 설치 성공
- TypeScript/Vite build 성공
- ESLint 성공
- working tree clean

현재 애플리케이션 실행에 필수인 `.env`나 외부 서비스 인증은 없다.

## 4. 개발 서버 확인

```powershell
npm run dev
```

Vite가 출력한 Local URL의 `/baseKit/` 경로가 정상 응답하는지 확인한다.

## 5. 문서 확인 순서

1. `AGENTS.md`
2. `README.md`
3. `docs/basekit-current-status.md`
4. 작업 관련 `docs/01~04` Architecture 문서
5. 관련 `docs/decisions` ADR
6. Lifecycle 작업이면 `docs/basekit-business-object-lifecycle-architecture.md`

## 6. 진행 중 작업 복구

```powershell
gh auth login
gh pr list --repo caronkwon-dotcom/baseKit
gh pr checkout <PR번호>
```

GitHub가 Source of Truth다. Windows GPT Work clone과 WSL/IntelliJ clone을 직접 복사하거나 동기화하지 않는다.

## 7. 새 작업 시작

```powershell
git switch dev-pm
git pull --ff-only origin dev-pm
git switch -c feat/<작업명>
```

작업 완료 후 feature branch를 Push하고 `dev-pm` 대상 PR을 생성한다. `dev-pm` 검수와 사용자 승인 후 `dev-pm → main` 승격 PR을 사용한다.

## 8. 배포

- Pull Request: 자동 build만 수행하고 배포하지 않는다.
- `main` push: GitHub Pages build 및 배포를 수행한다.
- 배포 주소: `https://caronkwon-dotcom.github.io/baseKit/`
