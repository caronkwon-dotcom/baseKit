# ADR 017. 7자리 테이블명과 4자리 SQL Alias 규칙

## 상태

`APPROVED`

## Context

BaseKit은 여러 고객사와 개발팀에서 반복 사용한다. 테이블명이 지나치게 길면 SQL 가독성이 떨어지고, 개발자마다 임의 Alias를 사용하면 같은 테이블도 쿼리마다 다르게 읽히는 문제가 생긴다. 짧은 약어만 제공하면 신규 개발자가 의미를 익히기 어려우므로 Full Name과 논리명을 함께 관리해야 한다.

## Decision

### 테이블명

물리 테이블명은 다음 7자리 구조를 사용한다.

```text
B + MODULE_CODE(2) + TABLE_CODE(4)
```

- `B`: BaseKit 솔루션 코드
- `MODULE_CODE`: 2자리 업무 모듈 코드. 시스템 공통은 `SY`
- `TABLE_CODE`: 테이블별 4자리 고유 코드
- 영문 대문자만 허용하며 정확히 7자리여야 한다.
- 조합된 물리 테이블명과 TABLE_CODE는 Repository 전체에서 중복될 수 없다.

예: `BSYCMCD = BaseKit System Common Code`

### SQL Alias

- SQL에서 기본 Alias는 물리 테이블명의 마지막 4자리 `TABLE_CODE`로 고정한다.
- Alias는 대문자로 작성한다.
- 조회·조인·서브쿼리를 포함한 MyBatis SQL도 같은 규칙을 적용한다.
- 같은 테이블이 한 Query Scope에 한 번만 등장하면 다른 Alias를 사용할 수 없다.
- 자기조인 또는 동일 테이블 다중 조인에서는 기본 코드의 마지막 한 자리를 순번으로 바꾼 4자리 Alias를 사용한다.
  - 예: 조직 기본 `ORGN`, 동일 Scope의 추가 조직 `ORG1`, `ORG2`
- 서브쿼리는 별도 Scope이므로 충돌하지 않으면 기본 Alias를 다시 사용한다.

```sql
SELECT USRM.USER_ID,
       COMP.COMPANY_NAME
  FROM BSYUSRM USRM
  JOIN BSYCOMP COMP
    ON COMP.COMPANY_ID = USRM.COMPANY_ID
```

### 의미 정보

각 테이블은 다음 정보를 Schema Catalog에서 함께 관리한다.

- 물리 테이블명
- 논리 테이블명
- Full Name
- 모듈 코드
- 4자리 테이블 코드
- 기본 SQL Alias
- 설명과 검토 상태

DDL 생성 시 `COMMENT ON TABLE`에는 논리명, Full Name과 설명을 기록한다.

## Guard

DDL 승격 전 다음 조건을 검사한다.

1. 물리 테이블명이 정확히 7자리인가
2. 솔루션 코드와 모듈 코드가 등록된 코드인가
3. TABLE_CODE와 기본 Alias가 정확히 같은가
4. 물리명과 Alias가 다른 테이블과 중복되지 않는가
5. Full Name과 논리명이 모두 등록됐는가
6. SQL에서 등록 Alias가 아닌 임의 Alias를 사용하지 않았는가
7. `USER` 등 대상 DB 예약어와 충돌하지 않는가

## 영향

- `frontend/meta/schema-tables.json`을 테이블명과 Alias의 Source로 사용한다.
- 테이블관리 화면에서 물리명, Full Name과 기본 Alias를 함께 표시한다.
- 실제 Flyway DDL과 MyBatis Mapper는 Schema Catalog 승인 후 생성한다.
- 고객사 접두어나 모듈 체계가 달라질 경우 Source Catalog 변환과 영향 목록을 먼저 생성한다.
