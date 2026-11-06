# ADR 040: DB 객체 소유자는 basekit으로 통일

- 일자: 2026-11-06
- 상태: 사용자 결정

## 배경

V28(`COMMENT ON`)이 `bsdaanls` 등 29개 테이블의 소유자가 `postgres`여서 실패했다(42501). Flyway 이력은 V1~V27 모두 `basekit`이 적용했으므로 복원·이관 등으로 소유자가 달라진 것으로 보이나 원인은 확인하지 못했다. PostgreSQL의 `ALTER TABLE`, `COMMENT ON`은 소유자(또는 슈퍼유저)만 실행할 수 있어 소유자가 섞이면 migration이 막힌다(V25에서도 발생).

## 결정

1. 모든 BaseKit DB 객체(테이블·시퀀스·뷰·스키마·DB)의 소유자는 `basekit`이다.
2. 테이블 생성과 migration 실행은 항상 `basekit` 계정으로 한다. 앱, IntelliJ 데이터소스, `BASEKIT_DB_USERNAME`도 `basekit`을 쓴다.
3. 덤프 복원은 `pg_restore --no-owner --role=basekit`을 쓴다. `postgres`로 DDL을 실행해야 하면 먼저 `SET ROLE basekit;`을 실행한다.
4. 새 migration을 적용하기 전에 소유자를 점검한다: `SELECT tablename, tableowner FROM pg_tables WHERE schemaname='public' AND tableowner <> 'basekit';` 결과가 있으면 DBA가 `ALTER ... OWNER TO basekit`으로 먼저 정리하고, 작업자는 보고에 포함한다.
5. 작업자는 공유 DB의 소유권을 임의로 변경하지 않는다. 점검 쿼리와 정리 스크립트를 PM에게 제공한다.
