# ADR 033. 테스트와 실제 E2E의 Database 경계

## Status

ACCEPTED — 2026-09-30

## 결정

- 단위 테스트와 Backend 통합 테스트는 H2를 계속 사용할 수 있다.
- 실제 로컬 실행과 브라우저 기반 E2E는 PostgreSQL 또는 프로젝트에서 실제로 채택한 Database를 사용한다.
- H2 통과만으로 실제 로컬 실행 및 E2E 완료로 표시하지 않는다.
- 실제 DB 검증이 필요한 기능은 DB 접속정보와 Migration 상태를 확인한 뒤 브라우저 E2E를 수행한다.

## 영향

- H2는 빠른 회귀검증과 테스트 격리를 담당한다.
- 실제 DB 검증은 PostgreSQL 호환성, Migration, 제약조건, 저장·조회 유지 여부를 확인한다.
- Requirement Excel Import의 보류된 Upload/Preview/저장/새로고침 검증은 local H2가 아니라 PostgreSQL 환경 정상화 후 재개한다.
