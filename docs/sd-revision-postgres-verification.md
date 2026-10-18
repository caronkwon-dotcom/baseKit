# SD Revision PostgreSQL 검증 (2026-10-18)

## 실제 DB와 Flyway

- 대상: PostgreSQL 17.11, `localhost:5432/basekit`, 사용자 `basekit` (개발 DB).
- 첫 조회 V20. V21 schema history: `2026-10-18 21:29:33.234716` Asia/Seoul, `success=true`, 실행 57ms. 후속 프로젝트 Flyway API `validate()`는 21개 migration 통과, `migrate()`는 version 21/up to date (0 pending). 별도 재적용·clean·repair·기존 migration 변경 없음.
- V21 적용 직전 전체 행 해시는 수집하지 못했다. 적용 후 기준 스냅샷과 전체 검증 종료 시 기존 SD 30개 테이블의 건수/전체 행 해시가 모두 동일하다. 전용 테스트 프로젝트만 비교에서 제외했다.
- 기존 요구사항 161, 그룹 12, 요구사항 이력 12, 그룹 분석 39, 그룹 분석 Context 18, 그룹 멤버 111, 프로젝트 그룹핑 2, RAW 2, 등록 근거 5 유지. 기존 첨부 0.

## 기능과 보완

실제 PostgreSQL opt-in `RequirementRevisionPostgresTest` 6개는 전용 UUID 프로젝트/레코드를 만들고 매 테스트 트랜잭션을 rollback한다. 변경/저장/확정/취소, 사유 필수/행위자 HTTP 계약, 기존 첨부 ID·STORAGE_KEY 재사용 및 이전 bytes 보존, 논리 폐기 멱등성, 실제 분석 참조 잠금, 그룹 REVIEW_REQUIRED/검토 snapshot 유지 검증. 파일 실체는 테스트 임시 저장소에 남으며 업무 DB 레코드는 rollback된다.

이 검증에서 JDBC 갱신과 MyBatis 세션 캐시 혼용 시 같은 트랜잭션의 `findOne`이 오래된 요구사항을 읽는 문제가 확인되었다. RequirementMapper의 해당 조회에 `flushCache=true`만 추가하여 새 projection을 읽게 했다. 보완 후 PostgreSQL 6개와 H2 Revision 8개 통과.

실제 Edge 5188 → SD 8098 → PostgreSQL 검수:
- 전용 프로젝트 `REV-REVIEW-20261018`, 요구사항 `REQ-FDBDB3A5-E24`, 그룹 `RG-dcf3a8b9002748589bc33ff9a3bce4d9`.
- 최초 Rev1 → PNG 1개 업로드 후 Rev2 → 변경 사유 입력 → Rev3 초안 생성/명칭 변경/저장 → 기존 첨부 1개 미리보기 → 확정/읽기전용.
- Rev4 초안 생성/취소 → 현행 Rev3 유지 → 전체 논리 폐기 → 폐기 포함 조회와 감사/확정/취소 이력 표시.
- 기존 파일 ID와 저장 키 승계, 중복 파일 저장·재업로드 없음. 그룹 REVIEW_REQUIRED, 기존 REVIEWED_REVISION/REVIEWED_SNAPSHOT 유지.
- 위 전용 레코드와 COMMON 호환 검증 레코드 1개는 논리 폐기하여 보존. 전용 그룹/이력/첨부 bytes도 검증 근거로 보존. 기존 업무 레코드는 수정하지 않음.

## COMMON 및 서버 전환

기존 COMMON target/classes 산출물을 별도 8099 `dev,common`으로 실행: Flyway 검증/JPA 검증/서버 기동/health UP, 구버전 요구사항 생성·PUT 저장 성공. 기존 SD 8083 프로세스의 신규 Revision 조회는 500이었으나 현행 새 프로세스 8098은 200이다. 기존 8083은 중지하지 않았다. 원래 COMMON 8081 listener는 없었다.

V21은 additive여서 구버전 생성·저장을 막지 않는다. 구버전 COMMON 쓰기는 Revision 잠금·폐기 사유·버전별 첨부 연결 정책을 우회할 수 있으므로 실제 사용 전 dev-pm 검토/병합 후 COMMON과 SD를 같은 새 빌드로 전환·재기동해야 한다. 특히 구버전 첨부 쓰기를 새 Revision 화면과 혼용하지 않는다. 구버전 물리 첨부 삭제는 이력 FK 때문에 실패할 수 있어 파괴적 검증은 실행하지 않았다. 이 제한은 구버전 쓰기 전환 과제이며 DB 적용 보류 사유가 아니다.

## 검증 결과

- 최종 backend 전체 95건: 89 통과, 외부 조건 6 skip, 실패/오류 0 (PostgreSQL opt-in 6건 포함).
- frontend 102/102, build/lint 통과. 기존 xlsx 정적/동적 import 및 대형 chunk 경고만 있음.
- PostgreSQL 현재 코드 서버 기동/HTTP 및 실제 브라우저 검수 완료. 운영 Host 권한·실제 LLM 재호출·대규모 부하는 이번 범위 밖.
- origin/dev-pm 대비 merge-tree 충돌 없음, V19/V20/V21 번호 충돌 없음. PR에는 선행 프로젝트 그룹핑 2커밋 및 b30d5e3 포함. dev-pm 직접 merge/cherry-pick 없음.
