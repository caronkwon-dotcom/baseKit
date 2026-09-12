# Backend 개발 가이드

## 실행 환경

- Java 21
- Maven 3.6.3 이상
- PostgreSQL 17

## 로컬 실행

PostgreSQL을 먼저 준비하고 다음 환경변수를 필요에 따라 지정한다.

```text
BASEKIT_DB_URL=jdbc:postgresql://localhost:5432/basekit
BASEKIT_DB_USERNAME=basekit
BASEKIT_DB_PASSWORD=basekit
```

Repository 루트에서 실행한다.

```bash
npm run backend:run
```

## Codespaces 실행

Codespace 생성 후 두 터미널에서 각각 실행한다.

```bash
npm run backend:run
npm run dev
```

Ports 화면에서 Frontend와 Backend URL을 확인한다. Backend 포트는 기본적으로 Private를 유지한다. Frontend 개발 서버가 Backend Health와 API 문서 경로를 Proxy하므로 일반 개발에서 별도의 CORS 허용은 추가하지 않는다.

## Spring Profile

- 기본 Profile: 로컬 개발, `localhost` PostgreSQL
- `codespace`: Dev Container의 PostgreSQL 서비스 사용
- `prod`: Swagger UI 비활성화와 Health 상세정보 비공개
- 상시 개발서버가 추가되면 `dev` Profile과 Secret 정책을 별도로 정의한다.

## 패키지 기준

```text
com.caron.basekit
├─ common
│  ├─ api
│  └─ persistence
└─ system
   └─ health
```

업무 기능은 `system/{domain}` 또는 추후 업무 모듈 패키지 아래에 Controller, Application Service, Domain, Persistence 책임을 구분해 추가한다. 작은 CRUD까지 형식적으로 과분할하지 않는다.

## 데이터 접근 기준

- Entity와 JPA: Schema 구조, 단순 관계와 변경 감지
- MyBatis: 실제 업무 SQL과 목록 조회
- Migration: 승인된 물리 DB 변경
- API/DTO/Entity 업무 필드: `SCREAMING_SNAKE_CASE`
- Java 내부 지역변수와 메서드: camelCase

## 검증

Core DB 검증 API:

```text
GET http://localhost:8080/api/core/database/status
```

기본 테스트는 H2에서 REST → Service → MyBatis → Flyway Marker를 검증한다. `BASEKIT_DB_URL`이 PostgreSQL JDBC URL로 설정된 환경에서는 외부 PostgreSQL 통합 테스트도 활성화된다. 세 `BASEKIT_DB_*` 변수는 반드시 함께 설정한다.

```bash
npm run backend:test
npm run build
npm run lint
git diff --check
```
