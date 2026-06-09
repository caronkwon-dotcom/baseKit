# BaseKit Meta

BaseKit은 업무시스템 개발을 위한 참조 아키텍처 프로젝트입니다.

이 저장소는 React/Spring 코드보다 먼저 관리되어야 하는 메타데이터를 정의합니다.

## 목적

- 표준용어 관리
- 도메인 타입 관리
- 메뉴/프로그램/액션 정의
- 향후 DB, API, UI 생성 기반 마련

## 원칙

1. 컬럼명은 가능한 도메인으로 끝난다.
2. 도메인은 데이터 타입을 결정한다.
3. 메뉴와 프로그램은 분리한다.
4. 버튼은 Action으로 관리한다.
5. 개발자의 자유도보다 일관성을 우선한다.

## 주요 파일

- meta/domains.json
- meta/terms.json
- meta/codes.json
- meta/menus.json
- meta/programs.json
- meta/actions.json