# ADR 024. Core Backend PostgreSQL 검증 경계

## 상태

승인 / 구현 및 PostgreSQL 통합검증 완료

## 배경

BaseKit Backend에는 Java 21, Spring Boot 3.5, JPA, MyBatis, Flyway와 PostgreSQL Driver가 준비되어 있으나, 외부 PostgreSQL까지 이어지는 최소 Persistence 흐름을 실제로 검증하는 기능이 없었다. Standard Design보다 Core DB 기반을 먼저 확정해야 이후 공통코드·프로그램·메뉴·권한을 안정적으로 구현할 수 있다.

## 결정

- 외부 DB는 표준 JDBC PostgreSQL로 연결하고 Supabase 전용 SDK에는 의존하지 않는다.
- 접속정보는 `BASEKIT_DB_URL`, `BASEKIT_DB_USERNAME`, `BASEKIT_DB_PASSWORD` 환경변수로만 주입한다.
- Flyway V1의 `BACKEND_FOUNDATION_V1` Marker를 재사용한다.
- `/api/core/database/status`는 REST → Core Service → MyBatis Mapper → DB 조회 흐름을 검증한다.
- 응답에는 DB 제품명과 Migration Marker만 포함하며 URL·계정·비밀정보는 노출하지 않는다.
- H2 테스트는 로컬 회귀검증, PostgreSQL 테스트는 실제 외부 DB 통합검증으로 분리한다.
- Core 패키지는 Standard Design을 참조하지 않는다.

## 영향

- 다음 Core DDL은 반드시 Flyway Migration으로 추가한다.
- JPA는 Schema·관계 설계에, MyBatis는 업무 SQL에 사용하는 기존 결정을 유지한다.
- Supabase 교체 시에도 JDBC 접속정보만 변경하면 Core 코드는 유지된다.
- PROGRAM·MENU·PERMISSION 구현은 이번 범위에 포함하지 않고 아래 선행 순서를 유지한다.

```text
DB Foundation → 공통코드 → Program → Menu → Permission
```
