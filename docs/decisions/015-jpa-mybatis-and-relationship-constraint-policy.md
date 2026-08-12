# ADR-015 JPA·MyBatis 역할과 관계 제약조건 정책

## Status

ACCEPTED

## 배경

BaseKit은 여러 고객사에 배포할 수 있는 SI Foundation이다. Entity 기반 설계를 통해 테이블·컬럼·도메인·관계를 일관되게 정의할 필요가 있지만, 실제 업무 조회는 복잡한 JOIN, Grid, Batch, Interface와 성능 최적화가 필요하다. 또한 모든 논리 관계를 물리 FK로 강제하면 데이터 정합성은 높아지지만 고객사 이관, 대량 적재, 이력 보존과 운영 대응의 유연성이 낮아질 수 있다.

## 결정

### 기술 역할

```text
Hibernate/JPA
  → Entity 기반 Schema 설계
  → 테이블·컬럼·인덱스·관계 정의
  → 초기 DDL과 변경 DDL 초안 생성

MyBatis
  → 실제 업무 CRUD
  → 복잡한 조회·Grid·통계
  → Batch·Interface
  → DB별 성능 최적화 SQL

운영 배포
  → 자동 Schema 변경 금지
  → 검수·승인된 ALTER/Migration Script 적용
  → 애플리케이션 시작 시 Schema 검증
```

Hibernate가 운영 DB를 직접 변경하는 방식은 사용하지 않는다. Entity 변경으로 생성된 DDL은 검토 대상 초안이며, 운영 적용 여부와 순서는 별도 Migration 절차에서 결정한다.

### 관계와 FK

모든 데이터 관계는 논리 관계로 먼저 등록한다. DB의 물리 FK Constraint 생성 여부는 관계의 성격에 따라 별도로 결정한다.

```text
논리 관계
USER.COMPANY_ID → COMPANY.COMPANY_ID

물리 FK
FOREIGN KEY (COMPANY_ID) REFERENCES COMPANY(COMPANY_ID)
```

Entity 연관관계와 DB 물리 FK는 동일한 개념으로 강제하지 않는다. 필요하면 Entity에 참조 ID만 두거나 `ConstraintMode.NO_CONSTRAINT` 등으로 물리 Constraint 생성을 억제할 수 있다.

## 관계 등급

| 등급 | 의미 | 기본 정책 |
|---|---|---|
| REQUIRED | 동일 모듈의 핵심 정합성 관계 | 물리 FK 필수 |
| RECOMMENDED | 일반 업무 관계 | 기본 생성, 승인으로 제외 가능 |
| LOGICAL_ONLY | 이력·로그·모듈 간 느슨한 관계 | 인덱스와 정합성 점검만 적용 |
| EXTERNAL | 외부·Legacy 식별자 | 물리 FK 금지 |

### 물리 FK 우선 대상

- 회사와 조직
- 사용자와 계정
- 사용자와 소속
- 메뉴와 상위 메뉴
- Role·Program·Action 연결
- 코드그룹과 코드
- 동일 Aggregate 안의 Header와 Detail

### 논리 FK 우선 대상

- 외부 시스템·Legacy 식별자
- Interface 송수신 이력
- Audit·접속·호출 로그
- Outbox·Event
- 원본 삭제 후에도 보존해야 하는 이력
- 고객사별 확장 속성
- 대량 반입용 Staging
- 모듈 간 느슨한 참조

## Schema 관계 메타데이터

향후 DB 설계 도구는 관계를 다음 수준으로 관리한다.

```text
SCHEMA_RELATION
- RELATION_ID
- CHILD_TABLE_ID
- CHILD_COLUMN_ID
- PARENT_TABLE_ID
- PARENT_COLUMN_ID
- RELATION_GRADE_CODE
- PHYSICAL_FK_YN
- DELETE_RULE_CODE
- INDEX_REQUIRED_YN
- VALIDATION_RULE_CODE
- DESCRIPTION
```

DDL Generator는 `PHYSICAL_FK_YN`과 관계 등급을 기준으로 Constraint 생성 여부를 결정한다. 물리 FK가 없어도 관계 정의와 영향 분석 정보는 유지한다.

## 삭제 정책

- 기본값은 `ON DELETE RESTRICT`로 한다.
- 선택 관계는 승인 후 `SET NULL`을 허용한다.
- `CASCADE DELETE`는 생명주기가 완전히 동일한 소유 관계에만 제한적으로 사용한다.
- Audit·이력·Interface 데이터는 원본 삭제에 연동해 삭제하지 않는다.
- 운영 편의를 이유로 FK를 임시 해제하는 방식을 기본 운영 절차로 삼지 않는다.

## 물리 FK가 없는 관계의 정합성

물리 FK를 생성하지 않은 관계는 정합성 책임이 사라지는 것이 아니다.

- 입력·수정 시 Application Validation
- 참조 컬럼 Index
- 고아 데이터 점검 Query
- Scheduler 기반 정기 점검
- 오류 건수와 상세 목록 운영 모니터링
- 정합성 예외 사유와 허용기간 관리

## 설계 단계 확인사항

새로운 Table 관계를 설계할 때 다음을 결정한다.

1. 두 데이터의 생명주기가 같은가.
2. 동일 모듈·동일 Transaction에서 관리되는가.
3. 부모 삭제 후 자식 데이터를 보존해야 하는가.
4. 외부 시스템이나 고객사 Schema를 참조하는가.
5. 대량 적재·이관·복구 시 FK가 운영 장애요인이 되는가.
6. 물리 FK가 없을 경우 어떤 Validation과 모니터링이 필요한가.
7. 삭제 규칙과 Index가 정의됐는가.

## 적용 원칙

- JPA Entity의 존재만으로 물리 FK를 자동 확정하지 않는다.
- 모든 관계는 논리 관계 메타데이터와 설계서에 남긴다.
- 물리 FK 제외는 편의가 아니라 명시적인 등급과 사유에 따른다.
- MyBatis SQL에서도 관계 메타데이터와 승인된 물리명을 기준으로 작성한다.
- Schema 변경은 영향 목록과 재테스트 범위를 확인한 후 적용한다.
- 프로젝트별 물리 FK 정책 차이는 배포 Profile로 관리하되 BaseKit 기본 등급은 유지한다.

## 결과

Entity 기반 Schema 설계와 전통적인 SQL 개발방식을 함께 유지할 수 있다. 핵심 데이터는 DB Constraint로 보호하고, 외부연계·로그·이력·확장영역은 논리 관계와 모니터링으로 운영 유연성을 확보한다.
