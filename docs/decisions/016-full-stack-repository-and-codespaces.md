# ADR-016 Full Stack Repository와 Codespaces 개발환경

## Status

ACCEPTED

## 배경

BaseKit의 Frontend 공통 구조와 JSON Prototype이 실제 사용자·회사·직무·메뉴·권한·로그인 Foundation으로 확장되면서 서버 권한 검증, 관계형 데이터, 트랜잭션과 변경 이력 검증이 필요해졌다. 기존 Repository는 React 프로젝트가 루트에 있었고 Spring REST와 DB는 문서 설계 상태였다.

## 결정

Repository를 다음 Full Stack 구조로 운영한다.

```text
frontend/       React + Vite
backend/        Spring Boot REST API
database/       Flyway Migration과 DB 산출물
.devcontainer/  Codespaces 개발환경
```

Backend 기준 기술은 다음과 같다.

- Java 21
- Spring Boot 3.5 계열
- Maven
- PostgreSQL
- Flyway
- JPA/Hibernate: Entity, Schema와 DDL 설계·검증
- MyBatis: 업무 CRUD, 복합 조회, Grid, Batch와 Interface SQL
- OpenAPI/Swagger UI

Spring Boot 4 계열이 현재 제공되더라도 BaseKit V1은 SI 현장 적용성과 라이브러리 안정성을 우선하여 Spring Boot 3.5 계열에서 시작한다. 대규모 버전 전환은 별도 ADR로 검토한다.

## Codespaces 역할

Codespaces에서는 Frontend, Spring Boot와 PostgreSQL을 함께 실행한다.

- `5173`: Frontend
- `8080`: Backend API
- `5432`: PostgreSQL

Codespaces는 개발과 통합검증에 사용한다. 유휴 상태에서 정지되고 URL 수명도 개발 세션에 종속되므로 상시 개발서버나 운영 WAS로 사용하지 않는다. 상시 공유환경이 필요해지면 별도 Hosting과 배포 Profile을 결정한다.

## Schema 정책

- Hibernate의 운영 Schema 자동 변경을 금지한다.
- 기본 `ddl-auto`는 `validate`다.
- 검토 완료된 DB 변경은 `database/migration`에 추가한다.
- 기존 Migration은 수정하지 않고 신규 버전 파일을 추가한다.
- 운영 반영은 승인된 Migration을 통해 수행한다.

## Frontend 연동

Frontend는 직접 DB에 접근하지 않고 Repository/Adapter를 통해 REST API와 연결한다. 기존 JSON Adapter는 기능별 REST Adapter가 완성될 때까지 유지하며 한 번에 전환하지 않는다.

## 결과

Frontend Prototype을 유지하면서 Backend 기능을 도메인별로 점진 이관할 수 있다. 로컬 JDK나 PostgreSQL 설치 여부와 관계없이 Codespaces에서 동일한 Full Stack 개발환경을 재현할 수 있다.
