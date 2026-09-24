# ADR-019 공통 Starter 임베드와 선택형 Host 배포

## Status

ACCEPTED

## 배경

BaseKit 시스템 공통은 독립 업무시스템이 아니라 여러 SI 업무 프로젝트가 반복 사용하는 Foundation이다. 공통 AA가 기준 소스를 관리하고 업무 개발자는 승인된 버전을 사용하되, 공통 구현을 프로젝트마다 복사하거나 임의 수정하지 않아야 한다.

고객사와 업무 규모에 따라 시스템 공통 기능을 각 업무 WAS에 포함할 수도 있고, 시스템관리 기능만 별도 실행해야 할 수도 있다. 그러나 아직 통합 인트라넷형 단일 Frontend Portal과 상용 UI 솔루션 라이선스 배치까지 한 번에 확정하기에는 이르다.

## 결정

BaseKit V1의 배포 경계는 다음으로 확정한다.

1. 공통 AA는 BaseKit 기준 Repository에서 공통 소스와 배포 Artifact를 관리한다.
2. Backend 공통 기능은 장기적으로 Maven Artifact인 `basekit-core`와 `basekit-system-starter`로 제공한다.
3. 업무 프로젝트는 승인된 버전의 Starter를 의존성으로 받아 자기 WAS에 임베드하는 방식을 기본으로 한다.
4. 시스템관리 기능을 별도 운영해야 하면 업무 코드가 없는 `basekit-system-host` 실행 프로젝트에 같은 Starter를 임베드한다.
5. 업무 개발자는 공통 소스를 복사하거나 수정하지 않고 공개된 API·설정·확장 지점만 사용한다.
6. 공통 수정은 BaseKit에서 검증·버전 발행한 뒤 업무 프로젝트가 의존성 버전을 명시적으로 올려 적용한다.
7. 현재 Full Stack 단일 Repository는 V1 기능과 계약을 검증하는 기준 개발공간으로 유지한다. 지금 즉시 Repository를 분리하지 않는다.

## 실행 형태

```text
BaseKit AA Repository
  ├─ basekit-core
  ├─ basekit-system-starter
  ├─ system-admin-ui artifact
  └─ database migrations
              │ versioned artifacts
              ├────────> 업무 프로젝트 A / 업무 WAS에 임베드
              ├────────> 업무 프로젝트 B / 업무 WAS에 임베드
              └────────> basekit-system-host / 선택형 독립 실행
```

임베드와 Host는 서로 다른 시스템 공통 구현을 만들지 않는다. 실행 껍데기만 다르고 같은 버전의 공통 Artifact를 사용한다.

## 캡슐화 경계

- `api`: 업무 프로젝트가 사용할 공개 계약
- `spi`: 고객사 또는 업무 모듈이 구현할 제한된 확장 계약
- `internal`: 공통 내부 구현. 업무 프로젝트의 직접 사용을 금지한다.
- 설정은 문서화된 Property와 Bean 확장 지점으로 제한한다.
- 공통 화면은 빌드된 정적 Asset 또는 UI Package로 제공하고, 업무 프로젝트에서 원본 화면 소스를 복사해 수정하지 않는다.

Java JAR는 컴파일된 Class뿐 아니라 설정, 리소스, Mapper XML과 Migration을 함께 포함할 수 있다. Frontend 소스 비공개가 필요한 배포에서는 빌드된 정적 Asset을 배포 단위로 사용한다. 실제 난독화나 지식재산 보호 수준은 고객 계약과 배포 환경에 따라 별도 결정한다.

## Database 및 실행 책임

- `SYSTEM_ID`는 업무시스템 경계 식별자이며 구매, 생산 등 독립 배포·권한 경계를 구분한다.
- 업무시스템 단위 DB User 또는 Schema를 기본 배포 후보로 한다.
- 여러 모듈이 한 WAS에 있더라도 모듈 경계와 DataSource 설정을 분리할 수 있게 설계한다.
- 타 Schema 접근은 DB 권한 부여가 기준이다. Oracle Synonym은 선택 수단이며 권한을 대신하지 않는다.
- Migration, Scheduler, 시스템관리 API가 여러 WAS에서 중복 실행되지 않도록 실행 역할을 설정으로 구분해야 한다.
- 구체적인 실행 모드 이름, Migration 소유자와 Scheduler Leader 정책은 실제 모듈화 전에 별도 결정한다.

## 버전 배포 원칙

- 내부 Maven Repository에 불변 버전 Artifact를 발행한다.
- 업무 프로젝트는 자동 최신화 대신 승인된 고정 버전을 사용한다.
- Patch 적용은 `공통 수정 → 공통 검증 → Artifact 발행 → 업무 프로젝트 버전 변경 → 영향범위 회귀검증` 순서로 진행한다.
- 공통 Artifact 변경 목록, DB Migration, 영향 프로그램과 재테스트 대상을 Release Note로 제공한다.

## 현재 범위에서 제외

다음은 BaseKit이 통합 인트라넷 또는 다수 업무 모듈을 한 Portal로 운영할 필요가 생겼을 때 별도 전략으로 결정한다.

- 단일 Frontend WAS/Portal
- 업무별 Frontend Module의 동적 조합 방식
- Grid·Report 등 상용 솔루션의 서버·사용자·도메인별 라이선스 최적화
- Frontend 통합 배포 Pipeline과 독립 Rollback

후속 검토 내용은 `docs/ideas/integrated-frontend-portal-and-license-strategy.md`에서 관리한다.

## 단계적 적용

1. 현재 Repository에서 시스템 공통 V1 기능과 API·DB 계약을 완성한다.
2. 공통과 업무 확장 경계를 패키지 수준에서 먼저 적용한다.
3. 임베드 가능한 Starter의 최소 기능을 정의하고 중복 실행 Guard를 검증한다.
4. 소비자 샘플 프로젝트로 버전 업그레이드와 회귀검증 절차를 확인한다.
5. 검증 후에만 Maven Multi-module 또는 별도 Artifact Repository 구조로 추출한다.

## 결과

현재 개발 속도를 유지하면서도 향후 공통 AA와 업무 DEV의 책임을 분리할 수 있다. 시스템 공통을 무조건 독립 WAS로 만들지 않고 고객사 규모에 따라 임베드 또는 Host를 선택할 수 있다. 통합 Frontend와 라이선스 문제는 근거가 확보되기 전까지 현재 V1 설계를 복잡하게 만들지 않는다.

