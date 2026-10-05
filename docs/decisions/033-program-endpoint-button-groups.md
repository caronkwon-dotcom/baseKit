# 033. Program Endpoint와 버튼 권한 그룹

## 상태

Accepted — COMMON-002 작업지시 범위의 구현 결정.

## 결정

- 기존 `BSYPROG`를 재사용한다. `BSYENDP`는 Spring MVC 런타임의 실제 application Controller mapping을 수집한다. Framework/Actuator Controller는 제외한다.
- Method·Path·Java Handler signature·RequestMapping condition으로 SHA-256 식별자를 만든다. params/headers/consumes가 다른 Handler를 합치지 않는다. Method 미지정 mapping은 Spring RequestMethod 전체로 확장한다.
- 기동 완료 시 트랜잭션으로 재수집한다. 기존 항목은 갱신하고 수집되지 않은 항목은 `STALE`로 보존한다. Program 연결은 재수집 시 유지된다. Handler/condition 변경으로 식별자가 바뀌면 기존 항목은 STALE이며 새 항목을 검토·연결한다.
- `BSYPREP`는 Program–Endpoint 다대다 관계이며 `(PROGRAM_ID, ENDPOINT_ID)`가 키다. `BSYBTGP`는 Program에서 사용하는 `COMMON.*` / `CUSTOM.*` 그룹을 저장한다. 개별 화면 버튼을 등록하지 않는다. 연결별 추가 GROUP_CODE는 선택사항이다.
- 그룹이 없으면 Program 권한만, 그룹이 있으면 동일 Program의 권한과 그룹 권한을 모두 요구한다. 공유 Endpoint는 하나의 완전한 Program+그룹 권한 조합으로 허용한다. 다른 Program의 그룹 권한을 섞지 않는다. 미사용 Program/그룹 조합은 허용하지 않는다.
- 실제 로그인 시스템이 없는 현재 Foundation에는 `EndpointPermissionProvider` 연결 계약과 MVC interceptor를 준비한다. Host가 서버의 신뢰할 수 있는 인증 정보로 Provider bean을 공급하면 집행한다. 기본 실행에는 Provider가 없으므로 기존 실행 동작을 유지한다. UI의 ADMIN과 요청 header를 서버 권한 근거로 사용하지 않는다. 운영 인증 연결 완료로 표시하지 않는다.
- 활성 Program 연결이 없는 Endpoint는 `UNMAPPED`이며 Runtime 기본 차단을 추가하지 않는다. 다른 Program 연결은 `OTHER_PROGRAM`으로 표시한다.
- DDL은 Flyway V9, Schema 검증은 JPA, 운영 SQL은 MyBatis를 사용한다. 연결·그룹 FK와 서버 검증으로 다른 Program의 그룹 연결 및 사용 중인 그룹 삭제를 방지한다.
- 기존 공통 `MasterDetailMultiGrid`에 선택형 resizable stacked mode를 추가한다. 기본 60:40 / 40:60, 기존 minimum/gap token과 Grid 밀도를 유지한다. 기존 Layout 호출은 영향을 받지 않는다.

## 후속 경계

Host 인증 Provider, Role 전체 관리, Menu 화면, Frontend 의존성 그래프 분석, UNMAPPED default deny는 별도 작업이다. PostgreSQL V9 적용은 이 작업에서 외부 DB에 실행하지 않았다.
