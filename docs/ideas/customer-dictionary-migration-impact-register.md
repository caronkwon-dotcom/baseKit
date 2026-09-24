# 고객사 용어집 전환 영향 목록과 재테스트 관리

## Status

IDEA_ACCEPTED

## 목적

BaseKit을 여러 고객사에 배포할 때 고객 용어집과 물리명 규칙을 적용하면 DDL, MyBatis SQL, DTO, API, Frontend, 배치와 Interface를 수정해야 할 수 있다. 초기 단계에서는 모든 변경을 자동화하지 못하더라도 변경 대상을 누락하지 않고 수동 작업 진행률과 재테스트 결과를 추적할 수 있어야 한다.

1단계 목표는 자동 소스 변경이 아니라 다음 세 가지다.

1. 변경 대상을 목록화한다.
2. 수정 상태와 담당·검수 상태를 관리한다.
3. 영향받은 기능과 재테스트 결과를 연결한다.

## 기본 Workflow

```text
고객 용어집 반입
  → BaseKit 기준과 Diff
  → 용어·물리명·도메인 변경 확정
  → Repository/DB 영향 대상 검색
  → Impact Register 생성
  → 수동 또는 자동 수정
  → 수정 검수
  → 영향 기능 재테스트
  → 증적 확인 후 전환 완료
```

## 변경 영향 대상

- Table·Column·PK·FK·Index·Constraint DDL
- MyBatis Mapper와 일반 SQL
- Backend DTO·Request·Response·Validation
- API 계약과 OpenAPI
- Frontend Type·검색조건·Form·Grid
- Excel Import·Export
- Batch·Scheduler
- 외부 Interface·전문·파일
- 보고서·통계·PDF
- Mock·Fixture·Test Data
- 단위·통합·E2E Test
- 설계서·운영 문서

## Impact Register 항목

각 변경 건은 최소 다음 정보를 가진다.

| 구분 | 내용 |
|---|---|
| 변경 ID | 전환 작업의 고유 ID |
| 사전 버전 | 고객 Dictionary Profile 버전 |
| Semantic Key | BaseKit 내부 의미 식별자 |
| 변경 전 | 논리명·물리명·도메인 |
| 변경 후 | 고객 논리명·물리명·도메인 |
| 변경 유형 | 이름 변경·타입 변경·분리·통합·코드 변환 |
| 영향 파일 | Repository 경로와 Line 또는 객체 ID |
| 영향 프로그램 | Program Key와 화면명 |
| 수정 상태 | 탐지·확정·수정 중·수정 완료·검수 완료 |
| 테스트 상태 | 미지정·필요·진행 중·통과·실패·제외 |
| 담당·검수자 | 작업과 승인 주체 |
| 증적 | Commit·PR·테스트 실행·결과 링크 |

## 위험도와 재테스트 범위

| 위험도 | 예시 | 기본 재테스트 |
|---|---|---|
| 낮음 | 논리 표시명만 변경 | 화면 표시·문서 확인 |
| 보통 | 물리 컬럼명 변경, 타입 동일 | Mapper CRUD·API 계약·영향 화면 |
| 높음 | 타입·길이·NULL·Key 변경 | 데이터 변환·CRUD·Interface·통합 테스트 |
| 매우 높음 | 컬럼 분리·통합, 코드 의미 변경 | 전환 리허설과 관련 업무 전체 통합 테스트 |

전체 시스템을 무조건 다시 테스트하지 않고 변경 사용처와 연결된 Program·API·Batch를 재테스트 대상으로 자동 추천한다. 단, 공통 인증·권한·코드처럼 다수 기능이 사용하는 항목은 공통 회귀 테스트 대상으로 승격한다.

## 모니터링 화면 제안

- 전체 변경 건수
- 영향 파일·DB 객체·프로그램 수
- 미확인·수정 중·수정 완료 건수
- 재테스트 필요·통과·실패 건수
- 매핑 누락과 검색 신뢰도 낮음 항목
- 위험도별 미완료 목록
- 담당자별 진행률
- 적용 예정 사전 버전과 대상 고객사

목록은 Excel로 내보낼 수 있어야 하며, 변경 ID를 기준으로 Commit·PR·Test 결과를 연결한다.

## 탐지 방식

1단계에서는 완벽한 Parser보다 실용적인 다중 검색을 사용한다.

- 물리명과 논리명 정확 일치 검색
- SCREAMING_SNAKE_CASE Token 검색
- JSON·TypeScript·TSX·XML·SQL·Java 파일 경로 검색
- Menu·Program·Action 메타데이터 역추적
- 동일 문자열이지만 업무 의미가 다른 항목은 수동 확인 대상으로 분리

검색 결과는 자동 수정하지 않고 `탐지 후보`로 등록한다. 담당자가 실제 영향 여부를 확정한 뒤 수정 대상으로 승격한다.

## 완료 조건

- 확정된 변경 건에 미처리 영향 대상이 없다.
- 모든 수정 대상이 Commit 또는 제외 사유와 연결됐다.
- 필수 재테스트가 통과했다.
- 실패·보류 항목에 승인된 처리 계획이 있다.
- 적용 DDL과 롤백 DDL이 확보됐다.
- 고객 Dictionary Profile 버전과 배포 버전이 고정됐다.

## 단계적 구현

### 1단계

- 고객 용어 Diff 등록
- Repository 문자열 검색과 영향 후보 목록
- 수동 상태 변경
- 영향 Program과 재테스트 목록 관리
- Excel Export

### 2단계

- MyBatis·TypeScript·Java 구조 분석 정확도 향상
- DDL Diff와 DB 객체 영향 연결
- Git Commit·PR·CI Test 자동 연결

### 3단계

- 안전한 단순 Rename 자동 변경안 생성
- Mapper·DTO·Frontend Type 재생성
- 위험도 기반 회귀 테스트 자동 실행

## 원칙

- 자동 탐지 결과를 곧바로 자동 변경하지 않는다.
- 수동 작업도 Impact Register 밖에서 진행하지 않는다.
- 단순 이름 변경과 데이터 의미 변경을 같은 위험도로 처리하지 않는다.
- 고객별 소스 Fork보다 Dictionary Profile과 변경 이력을 유지한다.
- 자동화 수준보다 누락 방지와 검수 가능성을 우선한다.
