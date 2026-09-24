# Core Backend / DB Foundation

## 이번 구현 범위

```text
GET /api/core/database/status
  → CoreDatabaseStatusController
  → CoreDatabaseStatusService
  → CoreDatabaseMarkerMapper (MyBatis)
  → BASEKIT_SCHEMA_MARKER
  → Flyway V1 BACKEND_FOUNDATION_V1
```

이 API는 애플리케이션이 올바른 DB에 연결됐고 승인된 Migration이 적용됐는지를 확인하는 개발·통합검증용 API다. 접속 URL, 사용자명, 비밀번호는 응답하거나 로그에 기록하지 않는다.

## 환경별 검증

- H2: `npm run backend:test`에서 전체 흐름을 자동 회귀검증한다.
- PostgreSQL/Supabase: 세 `BASEKIT_DB_*` 환경변수를 설정한 환경에서 동일 Service와 Marker를 통합검증한다.
- 운영: Schema 변경은 `ddl-auto`가 아니라 승인된 Flyway Migration으로만 수행한다.

## 다음 Core 도메인 사전 분석

### 공통코드

DB Foundation 다음 첫 구현 대상이다. 시스템 공통 코드그룹·코드의 저장·조회 기준을 확정하고 다른 도메인이 참조할 안정적인 코드 계약을 먼저 제공한다.

### Program

실행·MDI·권한의 기준 단위다. Frontend의 Program Key 및 Registry와 Backend `PROGRAM_ID`, `PROGRAM_KEY` 계약을 연결하되 React Component 자체를 DB가 소유하지 않는다.

### Menu

탐색 구조만 소유한다. GROUP 메뉴는 Program이 없고 실행 메뉴는 Program을 참조하며, 최대 3Depth 규칙을 Backend에서도 검증해야 한다.

### Permission

`ROLE × PROGRAM × ACTION_CODE`를 기준으로 한다. Menu 접근과 Program Action 허용을 혼동하지 않으며 로그인 Context와 Backend 집행이 준비된 뒤 연결한다.

## 결합 방지 경계

- `com.caron.basekit.core`는 Product Module 패키지를 참조하지 않는다.
- Standard Design의 메뉴·화면·LLM·용어집 파일은 Core DB 작업에서 변경하지 않는다.
- Product Module은 공개된 Core API와 Metadata 계약만 소비한다.
