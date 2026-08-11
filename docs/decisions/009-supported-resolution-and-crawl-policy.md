# ADR-009 업무 화면 지원 해상도와 수집 제어

## Status

ACCEPTED

## 결정

BaseKit의 1단계 UI는 휴대폰용 서비스가 아니라 업무용 시스템을 대상으로 한다.

- 권장 해상도: 1440×900 이상
- 최소 지원 해상도: 1024×768
- 반응형 범위: 1024~1280px 태블릿 가로모드
- 1024px 미만: 별도 모바일 UI를 제공하지 않고 업무 화면의 최소 폭과 가로 스크롤을 유지
- 데이터가 많은 Grid는 화면 자체를 축소하지 않고 Grid 내부 가로·세로 스크롤을 사용

검색 및 자동 수집 제어는 다음처럼 역할을 분리한다.

- HTML: `robots`와 `googlebot` 메타에 `noindex, nofollow, noarchive, nosnippet`
- 공개 데이터 경로와 대표 AI 수집 봇 차단 정책은 `public/robots.txt`에 정의한다.
- 현재 GitHub Project Pages 주소에서는 이 파일이 `/baseKit/robots.txt`에 놓이므로 표준 루트 `/robots.txt` 정책으로 자동 적용되지 않는다.
- 실제 robots 정책 적용은 사용자 사이트 저장소의 루트 robots 또는 BaseKit 전용 커스텀 도메인에서 수행한다.
- GitHub Pages는 공개 호스팅이므로 robots 규칙을 무시하는 봇이나 직접 접근은 막지 못한다.
- 비공개 자료를 올려야 하는 단계에서는 인증 가능한 호스팅으로 전환해야 한다.

`robots.txt`는 크롤링 요청 제어이고 검색 결과 제외 보장은 `noindex`가 담당한다. 검색 봇이 `noindex`를 읽어야 하므로 일반 HTML 전체를 robots에서 차단하지 않는다.
