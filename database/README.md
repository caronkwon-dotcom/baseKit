# Database

BaseKit의 검토 완료된 DB 변경 스크립트를 관리한다.

- `migration/`: Flyway가 순서대로 실행하는 변경 스크립트
- 개발환경에서도 `ddl-auto=validate`를 기본값으로 사용한다.
- JPA Entity는 Schema·DDL 설계와 검증에 사용한다.
- 실제 업무 CRUD·복합 조회는 MyBatis SQL을 사용한다.
- 운영환경에서는 Hibernate가 Schema를 자동 변경하지 않는다.

새 Migration은 기존 파일을 수정하지 않고 `V{번호}__{설명}.sql`로 추가한다.
