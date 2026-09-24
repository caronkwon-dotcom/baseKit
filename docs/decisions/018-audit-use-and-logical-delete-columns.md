# ADR 018. 공통 감사·사용·논리삭제 컬럼

## 상태

`APPROVED`

## Context

BaseKit의 기존 Prototype은 `CREATED_AT`, `UPDATED_AT` 등의 이름을 사용했다. SI 현장에서 반복 사용해 온 축약 규칙과 맞추고, 잠시 사용을 중지하는 상태와 삭제된 상태를 분리할 필요가 있다.

## Decision

관리 대상 업무 테이블의 공통 컬럼은 다음과 같다.

| 논리명 | 물리명 | 의미 | 기본값 |
|---|---|---|---|
| 등록일시 | `REG_DT` | 최초 등록 일시 | 현재 시스템 기준 일시 |
| 등록자 | `REG_BY` | 최초 등록 사용자 | 로그인 사용자 |
| 수정일시 | `MOD_DT` | 최종 수정 일시 | 현재 시스템 기준 일시 |
| 수정자 | `MOD_BY` | 최종 수정 사용자 | 로그인 사용자 |
| 사용여부 | `USE_YN` | 일시적 사용 중지 및 재사용 가능 | `Y` |
| 삭제여부 | `DEL_YN` | 논리적으로 삭제된 상태 | `N` |

- 등록 시 `REG_*`와 `MOD_*`를 함께 설정한다.
- 수정·사용중지·재사용·논리삭제 시 `MOD_*`만 변경한다.
- `REG_*`는 생성 후 변경하지 않는다.
- 일반 조회는 `DEL_YN = 'N'`을 기본 조건으로 강제한다.
- 실제 사용 가능한 선택 목록은 `USE_YN = 'Y' AND DEL_YN = 'N'`을 적용한다.
- `USE_YN = 'N'`은 삭제가 아니며 다시 `Y`로 전환할 수 있다.
- `DEL_YN = 'Y'`는 일반 화면과 선택 목록에서 제외한다.
- 업무 화면의 물리 삭제는 기본적으로 제공하지 않는다.

## 구현 기준

- Frontend 감사 필드는 `BaseEntity`, 관리 상태는 `ManagedEntity`에서 제공한다.
- Backend 감사 필드는 `BaseEntity`, 관리 상태는 `BaseManagedEntity`에서 제공한다.
- Schema Catalog는 `schema-common-columns.json`을 모든 시스템 공통 관리 테이블에 합성한다.
- API·DTO·MyBatis·JPA·DDL은 동일한 물리명을 사용한다.

## 기존 자산 처리

- 신규 코드와 아직 DB화되지 않은 Prototype은 새 규칙으로 전환한다.
- 이미 배포 이력이 있는 Flyway Migration 파일은 수정하지 않는다.
- `V1__create_basekit_schema_history_marker.sql`의 `CREATED_AT`은 정책 확정 전 생성된 Infrastructure Marker의 Legacy 예외로 기록한다.
- 실제 업무 테이블 생성 시점부터 본 규칙을 필수 적용한다.

## 추후 일괄 검토

다음 사항은 시스템 공통 V1 수직 기능이 일정 수준에 도달한 뒤 일괄 검토한다.

- 삭제 데이터 복구 화면과 권한
- 개인정보 파기와 물리 삭제가 필요한 법적 예외
- 이력 테이블·로그·순수 연결 테이블의 `USE_YN` 적용 예외
- 등록자·수정자의 ID 길이와 FK 적용 여부
- DB Trigger, JPA Auditing, Application Service 중 감사값 책임 위치
- 동시 수정 방지를 위한 Version 컬럼
