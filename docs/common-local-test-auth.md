# COMMON 로컬 테스트 인증 및 검수

실제 Host 인증은 공모전 이후 작업이다. 이 Provider는 COMMON 로컬 검수 전용이며 운영 인증 구현이 아니다.

## 보안 경계

- 기본 비활성. `BASEKIT_LOCAL_TEST_AUTH_ENABLED=true`와 32자 이상 `BASEKIT_LOCAL_TEST_AUTH_PASSWORD`를 환경에 명시한다. 자격은 저장소/명령행 인수/브라우저 URL에 저장하지 않는다.
- Spring 활성 프로필은 정확히 `local,common`만 허용한다. prod/production/staging/test/dev/알 수 없는 프로필이 섞이면 애플리케이션 시작을 거부한다. `SERVER_ADDRESS=127.0.0.1`, 포트 8081도 필수다. Vite common은 127.0.0.1:5174에만 바인딩한다.
- 실제 요청의 remote/local 주소와 Host 이름도 loopback으로 제한한다. unsafe 요청은 정확한 `Origin: http://localhost:5174`가 필요하다. 외부 프록시 배포에 사용하지 않는다.
- 사용자 `common-reviewer`, 역할 `COMMON_REVIEWER`. 프로그램은 `MENU_MGMT`, `DOCUMENT_CENTER`, `LYT_L1R2`만 허용한다. 메뉴 설정 읽기에는 MENU_MGMT, 저장에는 MENU_MGMT × SAVE 권한이 필요하다. 일반 업무·관리 API와 나머지 WINDOW 프로그램은 거부한다. 이 역할은 UI의 기존 mock admin 표기와 별개인 서버 검수 신원이다.
- 비밀 자격 비교 후 서버 세션을 발급하며 기존 세션을 폐기한다. 세션 유휴 만료 30분, POST `/api/core/local-test-auth/logout`으로 폐기한다. 쿠키는 Servlet 컨테이너의 HttpOnly JSESSIONID다. 로컬 HTTP 전용이므로 운영 HTTPS 인증으로 재사용하지 않는다.
- 예전 `basekit.window.allow-unauthenticated-development`는 제거했다. 설정 API와 WINDOW는 dev/local에서도 익명 허용하지 않는다. 실제 Host 없는 운영 보호 API 차단과 Endpoint 매핑 검사는 유지한다. 일반 dev API의 기존 동작은 이번 범위에서 확장하지 않는다.

## 실행

COMMON 저장소의 PowerShell에서 별도 백엔드 터미널로 실행한다. 테스트 자격은 비밀 입력으로 직접 지정한다(32자 이상).

```powershell
$env:BASEKIT_LOCAL_TEST_AUTH_ENABLED = 'true'
$taskCredential = Read-Host 'COMMON 테스트 자격 (32자 이상)' -AsSecureString
$env:BASEKIT_LOCAL_TEST_AUTH_PASSWORD = [System.Net.NetworkCredential]::new('', $taskCredential).Password
$env:SERVER_ADDRESS = '127.0.0.1'
# 선택: 실제 PostgreSQL과 기존 H2 파일을 건드리지 않는 격리 검수 DB
$env:SPRING_DATASOURCE_URL = 'jdbc:h2:mem:common-review;MODE=PostgreSQL;DATABASE_TO_UPPER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1'
node scripts/run-backend-maven.mjs -Plocal spring-boot:run -Dspring-boot.run.profiles=local,common
# 종료 후 환경에서 자격 제거
Remove-Item Env:BASEKIT_LOCAL_TEST_AUTH_PASSWORD, Env:BASEKIT_LOCAL_TEST_AUTH_ENABLED
```

프런트 별도 터미널: `npm run dev:common`. 5174/8081이 이미 점유되었으면 COMMON 실행 프로세스임을 먼저 확인하고 종료한다. 다른 worktree 서버를 종료하지 않는다. Vite common의 `/api/core` 프록시는 8081을 사용한다. localhost URL을 사용한다(127.0.0.1 Origin은 저장을 허용하지 않음).

1. `http://localhost:5174/api/core/local-test-auth`에 접속하여 common-reviewer와 지정한 테스트 자격으로 로그인한다.
2. `http://localhost:5174/baseKit/#/system/menus`의 메뉴관리 탭에서 SYS 선택, INNER/WINDOW·BASEKIT/LINEAR 변경 후 설정 저장.
3. 하위 SYS.MENU 선택: SYS 설정 상속과 읽기 전용 상태 확인. 새로고침 후 저장값 유지 확인.
4. SYS가 WINDOW일 때 시스템관리 → 메뉴관리 클릭: 독립 창. 다시 실행하면 같은 SYS 창을 재사용한다.
5. BASEKIT/LINEAR 변경 후 독립 창 새로고침. USER_MGMT는 테스트 역할에 없으므로 접근 거부.
6. DEV_GUIDE는 INNER에서 문서센터를 MDI로 실행한 뒤 WINDOW/LINEAR로 저장하여 문서센터·Layout L1R2 독립 실행 검수 가능.
7. 루트를 INNER로 저장하면 해당 `/window/{MENU_ID}/{PROGRAM_KEY}` 직접 주소와 새로고침 진입도 거부된다. 로그아웃/만료 후도 동일하다.

## 이번 실제 검수

- 지정 common-work 사용, 기존 미추적 `.env-check-tmp.txt` 보존. CURRENT.md 부재; 사용자 직접 개발·commit/push 승인에 따라 별도 TASK/PLAN 없이 진행. origin/dev-pm 확인만 수행(63bcb8e), merge/checkout/새 branch/worktree 없음.
- 실제 5174 → 8081, loopback 바인딩, local,common + 격리 H2 memory DB에서 검수했다. 실제 PostgreSQL 데이터와 migration 이력을 변경하지 않았다. memory 검수 설정은 백엔드 종료 시 사라진다.
- 인증 실패 중 SYS 선택/편집 잠금 안내, 테스트 로그인, SYS WINDOW/LINEAR 저장·새로고침 유지·SYS.MENU 상속, 메뉴 클릭으로 독립 창 열기와 동일 tab ID 재사용, BASEKIT 전환 렌더링, LINEAR 렌더링/새로고침, 권한 없는 USER_MGMT 거부, INNER로 복귀 후 직접 WINDOW URL 거부를 실제 브라우저에서 확인했다.
- DEV_GUIDE INNER 문서센터 MDI 탭 유지, WINDOW/LINEAR 저장 후 문서센터와 Layout L1R2 독립 창 렌더링도 확인했다. 검수 종료 설정: SYS INNER/BASEKIT, DEV_GUIDE WINDOW/LINEAR, STANDARD_DESIGN 기본값 유지.
- 실제 운영 Host 인증/운영 배포/PostgreSQL 적용·통합/강제 팝업 차단 설정 조작은 미수행. 팝업 차단 분기는 기존 모의 테스트 범위다.

## 자동 검증 (2026-10-18 종료)

- Frontend 전체 회귀 90건 통과, build/lint 통과. 기존 xlsx import/큰 번들 경고 유지.
- Backend 전체 77건: 72 통과, 외부 DB 조건 5 skip, 실패/오류 0. 이후 추가한 기본 비활성·운영 opt-in 오설정 테스트 2건을 포함한 최종 인증/메뉴/WINDOW 보안 회귀 9건 전부 통과.
- `git diff --check` 통과. 시작 미추적 `.env-check-tmp.txt`는 읽기/수정/커밋 없이 보존했다.
