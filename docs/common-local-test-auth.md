# 로그인 구현 전 실행 정책

2026-10-20 사용자 결정으로 임시 Host 확인 코드를 제거했다. 다음 명시적 사용자 지시 전까지 Host 확인·Host 인증 연결 요구·Window 접근 확인을 다시 구현하지 않는다. 실제 로그인 구현 시 INNER/WINDOW/API에 적용할 인증·권한을 새로 설계한다.

`/api/core/window-access`와 Host/Principal 필수 검사, EndpointPermissionProvider와 실행 차단 interceptor는 제거했다. 설정 조회·저장은 프로필과 관계없이 기존 서비스로 처리하며, 메뉴 원본의 루트와 enum 검증은 유지한다. Window는 등록된 메뉴·프로그램·활성 컴포넌트를 프런트 메타데이터로 확인하고 즉시 표시한다. 디자인 설정 조회가 실패해도 BASEKIT으로 화면을 연다.

Program–Endpoint 관계·버튼 그룹 관리와 기존 데이터는 유지한다. 현재 상태는 로그인·서버 권한 집행 완료 상태가 아니다. 과거 Host 차단 검증 기록은 이 정책에 의해 대체된다.

COMMON 실행: npm run dev:common 및 node scripts/run-backend-maven.mjs spring-boot:run -Dspring-boot.run.profiles=local,common. 개발 검수 서버는 127.0.0.1에 바인딩한다. DB 구조 확대 없이 기존 V18 실행 설정을 사용한다.
