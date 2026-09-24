# 2026-09-12 Core DB Foundation

## 상태

Feature Branch 구현 / 외부 PostgreSQL 검증 완료

## 반영 내용

- Flyway V1 `BACKEND_FOUNDATION_V1` Marker 재사용
- Core MyBatis Mapper와 Service 추가
- `/api/core/database/status` 검증 API 추가
- H2 자동 통합 테스트와 외부 PostgreSQL 통합 테스트 분리
- `BASEKIT_DB_*` 환경변수 계약과 비밀정보 비노출 원칙 문서화
- PROGRAM·MENU·PERMISSION 선행 분석 기록

## 통합검증 결과

- Supabase Session Pooler를 통해 PostgreSQL 17.6 연결 성공
- Flyway가 빈 `public` Schema에 V1 Migration 적용 완료
- `REST API → Spring Service → MyBatis Repository → PostgreSQL → Flyway Schema Marker` 흐름 통과
- 접속정보는 실행환경에만 사용했으며 Repository에는 저장하지 않음
