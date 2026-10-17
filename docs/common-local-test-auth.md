# COMMON 로그인 없는 개발·시연 실행

2026-10-18 사용자 지시로 임시 LocalTestAuthProvider와 테스트 로그인 화면을 제거했다. 별도 Host/SSO/로그인을 개발하지 않는다.

- local/dev/test 프로필이며 실제 EndpointPermissionProvider와 Principal이 모두 없을 때 메뉴 실행 설정 조회·저장과 WINDOW 접근은 기존 INNER 수준으로 동작한다.
- 실제 Provider가 있으면 기존 프로그램 및 MENU_MGMT × SAVE 검사를 유지한다. Principal만 있고 Provider가 없는 경우도 거부한다.
- prod/production에서는 개발 프로필을 함께 지정해도 차단한다. 개발 프로필 없는 운영 배포 역시 로그인 연동 전 차단한다.
- WINDOW는 등록된 1Depth와 프로그램 소속 및 저장된 WINDOW 설정을 서버에서 확인한다.
- TODO: 공통 로그인 구현 때 INNER/WINDOW에 동일한 인증·권한 정책을 연결한다. 이 개발 경로를 운영 인증으로 사용하지 않는다.

COMMON 실행: npm run dev:common 및 node scripts/run-backend-maven.mjs -Plocal spring-boot:run -Dspring-boot.run.profiles=local,common. 개발 검수 서버는 127.0.0.1에 바인딩한다. DB 구조 확대 없이 기존 V18 실행 설정을 사용한다.
