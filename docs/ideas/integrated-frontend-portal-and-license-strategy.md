# 통합 Frontend Portal과 상용 UI 라이선스 전략

## Status

IDEA

## 배경과 문제

고객사에서 업무별로 WAS를 분리하면 Grid, Report 등 상용 UI 솔루션의 라이선스가 WAS·서버·도메인 단위로 추가될 수 있다. BaseKit이 향후 통합 인트라넷처럼 여러 업무 모듈을 제공한다면 Frontend를 하나의 Portal로 운영하는 편이 비용과 사용자 경험에 유리할 가능성이 있다.

현재는 실제 솔루션 계약 조건과 운영 토폴로지가 정해지지 않았으므로 BaseKit V1의 필수 Architecture로 확정하지 않는다.

## 아이디어 요약

- 사용자는 하나의 Frontend Portal과 Admin Shell에 접속한다.
- 업무팀은 모듈별 Frontend를 독립적으로 개발·검증한다.
- 중앙 Pipeline이 승인된 모듈 Asset을 Portal 배포물로 조합한다.
- Backend API/WAS는 업무 경계에 따라 독립 또는 통합 운영할 수 있다.
- 메뉴·프로그램 메타데이터가 업무 모듈과 API Endpoint를 연결한다.
- 공통 UI Adapter가 Grid·Report 제품 종속성을 격리한다.

## 기대 효과

- 상용 UI 솔루션 라이선스 비용을 줄일 가능성
- 사용자 접속점, 메뉴, 인증과 UI 일관성 통합
- Backend 업무 경계와 Frontend 사용자 경험을 독립적으로 설계

## 위험 및 영향범위

- 라이선스 절감 여부는 공급사 계약 기준에 따라 달라지므로 반드시 계약 검토가 필요하다.
- 한 번의 Frontend 장애와 배포가 전체 업무에 영향을 줄 수 있다.
- 모듈 간 의존성, Version 충돌, Cache와 독립 Rollback 정책이 필요하다.
- 단일 번들이 커지면 빌드·초기 로딩·배포 부담이 커질 수 있다.

## 선행조건

- 실제 고객사 Frontend/Backend 배포 토폴로지
- Grid·Report 제품과 라이선스 산정 기준
- 업무 모듈 수, 독립 배포 빈도와 장애 격리 요구
- 공통 인증, 메뉴·프로그램 Registry와 API Gateway 전략

## 결정이 필요한 사항

- 단일 빌드, Module Federation, 정적 Asset 조립 중 모듈 통합 방식
- 중앙 Pipeline 소유자와 업무 모듈 승인 절차
- 모듈별 독립 배포·Rollback 및 호환 Version 계약
- Frontend Portal 장애 격리와 무중단 배포 수준

## 관련 문서

- `docs/decisions/019-embedded-starter-and-optional-host-deployment.md`
- `docs/decisions/016-full-stack-repository-and-codespaces.md`

