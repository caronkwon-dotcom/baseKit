# ADR-035 1Depth 메뉴 실행 설정과 독립 셸

## Status

ACCEPTED

## 결정

2026-10-17 PM 승인에 따라 메뉴 원본은 기존 JSON과 등록된 Module Manifest로 유지한다. DB 메뉴 원본 전환은 수행하지 않는다. 실행 설정의 MENU_ID는 원본 1Depth menuKey와 대소문자를 포함해 정확히 일치하며, 하위 메뉴는 소속 1Depth 설정을 상속한다. 기본값은 INNER/BASEKIT이다.

EXECUTION_TYPE은 INNER/WINDOW, DESIGN_TYPE은 BASEKIT/LINEAR만 허용한다. 설정은 별도 테이블에 저장하고 런타임에서 결합한다. INNER의 기존 MDI 동작을 보존하며 WINDOW는 루트별 고정 창 이름으로 재사용한다. 독립 URL은 #/window/{MENU_ID}/{PROGRAM_KEY}이다. 요청자가 전달한 소속 정보만으로 권한을 부여하지 않는다.

2026-10-20 사용자 결정으로 임시 Host 확인 구현을 제거한다. `/api/core/window-access`, Host/Principal 필수 조건, Provider 기반 실행 차단 interceptor를 제거하며 프로필에 따른 Host 확인을 수행하지 않는다. 다음 명시적 사용자 지시 전까지 이를 재도입하지 않는다. 실제 로그인 구현 시 INNER/WINDOW/API 인증·권한을 새로 설계한다. 현재 구현은 로그인·서버 권한 집행 완료 상태가 아니다. Program–Endpoint·버튼 그룹 메타데이터와 순수 권한 판정 규칙은 설계 자료로 유지한다.

BASEKIT/LINEAR 디자인은 독립 셸 범위에만 적용한다. SD 화면, 외부 에디터, 프로세스 플로차트 및 HTML 설계서 작성 기능은 범위에서 제외한다.

## 구현 및 검증

V18 BSMEXCFG, 메뉴 설정 REST API, 생성된 원본 카탈로그 및 독립 셸은 유지한다. Window 진입은 등록된 루트·프로그램 소속·활성 컴포넌트를 프런트 메타데이터로 검증해 즉시 렌더링한다. 디자인은 기존 설정 목록에서 읽으며 조회 실패 시 BASEKIT으로 표시한다. 설정 조회를 진입 허용 조건으로 사용하지 않는다. 서버 설정 저장의 루트/enum 유효성 검증은 유지한다. 이전 [검증 기록](../common-menu-execution-verification.md)의 Host/Window 차단 결과는 과거 구현 이력이며 현 정책은 이 문서를 따른다.
