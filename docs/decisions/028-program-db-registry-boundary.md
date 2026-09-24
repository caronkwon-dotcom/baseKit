# 028. PROGRAM DB와 Frontend Registry 책임 경계

## 상태

Accepted

## 결정

- `BSYPROG`는 프로그램 식별자, 명칭, 모듈, 유형, 논리 경로와 사용 상태를 관리한다.
- React Component 이름과 구현 정보는 DB에 저장하지 않는다.
- Frontend `programRegistry.tsx`는 `PROGRAM_KEY → React Component` 연결만 소유한다.
- Menu는 Navigation이며 PROGRAM과 분리한다. 메뉴에 연결되지 않은 PROGRAM을 허용한다.
- 물리 변경은 Flyway, Schema 검증은 JPA, 실제 CRUD는 MyBatis로 수행한다.
- `MODULE_CODE`와 `PROGRAM_TYPE_CODE`는 공통코드 Option Source로 제공한다.
- PROGRAM 입력 화면은 공통 `FieldDefinition → MetadataForm` 계약을 변경하지 않고 재사용한다.

## 영향

향후 MENU DB화 시에도 PROGRAM 실행 Metadata와 Navigation 계층을 하나의 테이블로 합치지 않는다. Registry는 배포된 코드의 실행 가능 여부를, DB PROGRAM은 운영 Metadata와 권한 기준을 각각 담당한다.
