# Architecture

현재 baseKit은 React, Vite, TypeScript 기반의 프론트엔드 프로젝트다. 화면, mock 데이터, 타입, 상수, 유틸리티를 프론트엔드 내부에서 분리해 관리하며, 현재 단계에서는 API, DB, 로그인, 전역 상태 관리를 포함하지 않는다.

향후 Spring API와 연결할 수 있도록 도메인 타입과 mock 데이터를 API 응답 모델에 가깝게 유지한다. API 연동 단계에서는 mock 데이터 사용 지점을 service 또는 client 계층으로 교체하고, `src/types`의 타입 정의를 요청/응답 계약의 기준으로 삼는다.

## Directory Roles

- `src/types`: 메뉴, 역할, 권한, 공통코드 같은 도메인 데이터 구조를 정의한다.
- `src/mock`: API 연결 전 화면과 유틸 검증에 사용할 정적 샘플 데이터를 둔다.
- `src/constants`: 역할 코드처럼 여러 파일에서 공유하는 고정 값을 정의한다.
- `src/utils`: React, router, store에 의존하지 않는 순수 함수를 둔다.
