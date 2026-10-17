# ADR-035 1Depth 메뉴 실행 설정과 독립 셸

## Status

ACCEPTED

## 결정

2026-10-17 PM 승인에 따라 메뉴 원본은 기존 JSON과 등록된 Module Manifest로 유지한다. DB 메뉴 원본 전환은 수행하지 않는다. 실행 설정의 MENU_ID는 원본 1Depth menuKey와 대소문자를 포함해 정확히 일치하며, 하위 메뉴는 소속 1Depth 설정을 상속한다. 기본값은 INNER/BASEKIT이다.

EXECUTION_TYPE은 INNER/WINDOW, DESIGN_TYPE은 BASEKIT/LINEAR만 허용한다. 설정은 별도 테이블에 저장하고 런타임에서 결합한다. INNER의 기존 MDI 동작을 보존하며 WINDOW는 루트별 고정 창 이름으로 재사용한다. 독립 URL은 #/window/{MENU_ID}/{PROGRAM_KEY}이다. 요청자가 전달한 소속 정보만으로 권한을 부여하지 않는다.

운영에서는 Host 인증 Principal과 EndpointPermissionProvider가 없으면 독립 창과 민감 API 접근을 차단한다. 개발용 WINDOW 우회는 명시적 개발 환경과 별도 opt-in 설정이 모두 충족된 경우에만 허용하며 운영에서는 opt-in만으로 우회할 수 없다. Host 인증 인프라 전체를 이번 작업에서 구축하지 않는다.

BASEKIT/LINEAR 디자인은 독립 셸 범위에만 적용한다. SD 화면, 외부 에디터, 프로세스 플로차트 및 HTML 설계서 작성 기능은 범위에서 제외한다.

## 구현 및 검증

V18 BSMEXCFG, 메뉴 설정 REST API, 생성된 원본 카탈로그 및 독립 셸을 구현했다. 개발 opt-in은 basekit.window.allow-unauthenticated-development=true이며 dev/local 프로필에서만 적용하고 prod/production이 우선한다. 상세 API·운영 기본 차단·원본 동기화·검증 결과는 [검증 기록](../common-menu-execution-verification.md)을 따른다.
