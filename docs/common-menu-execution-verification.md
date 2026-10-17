# COMMON 메뉴 실행 설정 검증 (2026-10-17)

## 구현

- A: core/menuexecution, V18 양쪽 migration, 메뉴관리 UI, menuExecutionApi, 카탈로그 생성 스크립트 및 서버 테스트.
- B: AppLayout, runtime/menuExecution, 프런트 런처 테스트.
- C: main 및 layouts/standalone, core/windowaccess, EndpointPermissionConfiguration, 보안 테스트. 기존 MVC 테스트 3개는 test 프로필만 명시.
- 파일 소유권을 분리해 병렬 구현했고 Git index/commit/push는 통합 담당만 수행한다. 신규 branch/worktree, checkout, merge 및 dev-pm 변경 없음.

메뉴 원본은 JSON/등록 Module Manifest다. MENU_ID는 원본의 1Depth menuKey이며 하위 메뉴는 상속한다. GET /api/core/menu-execution-settings는 ApiResponse DATA 배열, PUT /api/core/menu-execution-settings/{menuId}는 EXECUTION_TYPE/DESIGN_TYPE을 저장하고 DATA 단일 설정을 반환한다. 미설정 INNER/BASEKIT, INNER/WINDOW 및 BASEKIT/LINEAR만 허용한다. BSMEXCFG에는 실행 설정만 저장한다. 기존 BSYMENU의 FOLDER/PAGE 계약은 변경하지 않는다.

서버 카탈로그는 실제 원본에서 생성한 배포 리소스이며 클라이언트의 소속 주장을 신뢰하지 않는다. 원본 변경 후 `node scripts/generate-menu-execution-catalog.mjs`로 재생성한다. root npm build와 backend:test는 --check를 먼저 실행해 불일치를 차단한다. 현재 생성기는 정적인 리터럴 Manifest만 지원하고 동적인 메뉴 선언은 명시적으로 실패한다. backend를 Maven으로 직접 빌드할 때도 카탈로그 check를 별도로 실행해야 한다.

## 인증/권한 계약

- 독립 URL: #/window/{MENU_ID}/{PROGRAM_KEY}; 서버 GET /api/core/window-access에서 원본 소속, WINDOW 설정, request principal 및 Host EndpointPermissionProvider.hasProgram을 검증한다.
- 기본값은 인증 우회 없음. 개발 WINDOW는 dev 또는 local 프로필과 `basekit.window.allow-unauthenticated-development=true`를 모두 명시한 경우에만 Host 연결 부재를 허용한다. 환경변수는 BASEKIT_WINDOW_ALLOW_UNAUTHENTICATED_DEVELOPMENT=true다.
- prod/production 프로필은 dev/local/test와 동시에 지정해도 우회보다 우선한다. 개발 프로필이 없는 환경도 운영 기본 차단을 적용한다. common 포트 프로필만으로는 개발 인증 우회를 켜지 않는다.
- 운영 /api/**는 Host provider와 principal이 필요하며 일반 API는 명시적 Endpoint 권한 매핑도 필요하다. 자체 검증하는 설정/독립 진입 Controller만 매핑 필수에서 제외하고 자체 권한 검사를 수행한다. 설정 PUT은 MENU_MGMT 권한을 추가로 요구한다. 기존 등록 버튼 그룹 권한 검사도 유지한다.
- dev/test의 일반 API 호환 동작은 유지한다. Host와 principal이 제공된 경우의 명시적 권한 거부를 WINDOW opt-in이 덮어쓰지 않는다.
- 실제 Host 인증 Provider는 저장소에 여전히 없다. 운영 Host 통합과 권한 매핑 없이는 의도적으로 접근이 차단된다. 전체 인증 인프라를 구현했다고 주장하지 않는다.

## 검증 결과

- frontend build 및 lint 통과. 기존 xlsx 중복 static/dynamic import와 번들 크기 경고 유지.
- frontend node test: 82 통과, 실패 0. 상속/기본값/소스 불변/URL 인코딩/창 이름 재사용 및 팝업 null·예외 모의 검증 포함.
- backend:test: 75건, 70 통과, 외부 DB 조건 5 skip, 실패/오류 0. H2 migration V18 및 저장/수정/잘못된 ID·enum 검증, 개발 opt-in/운영 차단/Principal/Host/Endpoint 매핑 검증 포함.
- 브라우저: 별도 5184 프런트와 8094 backend, 격리 H2 memory DB에서 메뉴관리 저장 및 하위 상속, 미설정 메뉴 MDI 실행, WINDOW 클릭과 동일 창 재사용, LINEAR/BASEKIT 셸, 새로고침, INNER 변경 후 직접 URL 접근 거부 확인.
- 직접 HTTP: 올바른 WINDOW 소속 200, 다른 루트의 프로그램 403, INNER 루트의 WINDOW 진입 403.
- 실제 브라우저의 강제 팝업 차단 설정은 조작하지 않았다. 차단 안내 분기는 모의 런처 테스트로 검증했다.
- 실제 PostgreSQL 적용, 실제 Host 인증 연동 및 운영 배포는 미수행. 기존 업무 DB와 실행 서버 보존.

## 시작 검증 및 실행환경

G:/CARON/basekit/common common-work에서 시작. HEAD와 fetch 후 origin/dev-pm은 63bcb8ebb2816bddb2b2b8c7ca1a262164e07267로 동일했다. 제한 환경의 Git은 Permission denied/work tree 오류를 냈으나 제한 밖 조회는 정상이며 시작 미추적 파일은 기존 .env-check-tmp.txt 하나였다. Git 메타데이터 수정이나 worktree 재생성 없이 실행환경 문제를 확인했다. 해당 파일은 읽거나 수정하거나 commit에 포함하지 않는다. CURRENT.md는 부재였으며 사용자의 직접 구현·병렬화·commit/push 지시를 우선하여 별도 TASK와 PLAN 승인을 생성하지 않았다.
