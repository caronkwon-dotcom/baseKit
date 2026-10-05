# COMMON-002 구현 결과

## 실행 기준과 상태

- 실행 기준: `common-work`의 `COMMON-002-program-endpoint-permission.md`.
- 시작 SHA: `ac1766d6a5022d411d1dc3a300eb45cc83510fc6`.
- Git 이력을 포함한 별도 로컬 checkout에서 시작했고 최초 status는 clean, 관련 open PR은 없었다. 기존 사용자 작업 사본은 변경하지 않았다. 사용자의 지정 브랜치 `common-work`를 유지했다.
- 구현 commit SHA: `4c6a3dff146b237cb4d70ee8acf380cba0371e97`.
- 이 RESULT는 구현 commit 이후 별도 문서 commit으로 기록한다. 최종 push SHA는 완료 보고에서 제공한다.

## 구현

기존 Program Master를 유지하고 하단 왼쪽 버튼 권한 그룹, 오른쪽 Endpoint 목록을 연결했다. `PageHeader`, `SearchPanel`, `BaseKitDataGrid`/`ProgramDataGrid`, `FieldDefinition`, `useGridRowState`, `BaseKitMessage`, `MasterDetailMultiGrid`를 재사용했다. 기존 Header 34px / Row 32px, 컬럼 fixed/min/flex, 말줄임·Tooltip, Grid 상단 전체 건수와 Action Toolbar, 하단 32px Message Area를 유지했다. DESIGN CSS를 복사하지 않았다.

기존 공통 Layout에 opt-in resizable stacked mode를 추가했다. TOP:BOTTOM 60:40, BOTTOM LEFT:RIGHT 40:60이며 Pointer capture Drag와 방향키/Home 조절을 제공한다. 최소 크기는 기존 180px/240px 높이와 master-min-width, gap token을 재사용한다. 기존 Layout 소비자는 새 mode를 지정하지 않으므로 기존 동작을 유지한다.

Program 미선택·DB 미등록·Empty 안내, Grid Loading, 공통 Error Message, 재조회 기능을 제공한다. 두 하단 목록을 함께 조회하고 비동기 응답 version으로 이전 Program 응답이 현재 목록을 덮어쓰지 않게 했다. 저장하지 않은 그룹 변경과 저장 도중 Program 전환을 보호한다. 기존 Source Program 등록 저장과 검색 조건을 실제 DB 연결 흐름에 맞췄다.

버튼 권한 그룹은 Program별 `COMMON.*`/`CUSTOM.*` 코드, 구분, 이름, 설명, 사용여부를 DB에 저장한다. 서버에서 코드 형식·구분 일치·중복을 검증한다. 사용 중인 그룹 삭제는 Endpoint 연결해제 후 가능하다. 개별 화면 버튼 목록은 생성하지 않았다.

`RequestMappingHandlerMapping`으로 application Controller의 실제 런타임 Mapping을 기동 완료 시 자동수집한다. Method, Path, Controller Class, Handler signature를 저장한다. Method가 지정되지 않은 Mapping은 RequestMethod 전체로 수집하며 조건별 Handler를 합치지 않는다. 매번 동일 식별자는 갱신하고 수집되지 않은 항목은 `STALE`로 보존한다. Endpoint 자체 등록/수정 API와 UI는 제공하지 않는다.

`BSYENDP`/`BSYBTGP`/`BSYPREP`는 Flyway V9, JPA Schema validate, MyBatis SQL을 사용한다. Program 원본은 `BSYPROG`를 재사용하고 Program–Endpoint는 다대다 연결이다. UI에서 선택 Program 연결, UNMAPPED, 전체 수집 목록을 전환한다. `OTHER_PROGRAM`으로 다른 Program 연결도 식별하며 추가 그룹 연결과 연결해제를 저장한다. FK 및 서버 검증으로 다른 Program의 그룹 연결을 방지한다. Endpoint 다건 연결 작업은 건별 트랜잭션이며 일부 실패 시 반드시 서버 목록을 다시 읽는다.

서버 `EndpointPermissionPolicy`는 일반 Endpoint의 Program 권한, 제한 Endpoint의 동일 Program+그룹 권한을 검사한다. 공유 Endpoint는 하나의 완전한 허용 조합이 필요하다. 미사용 Program/그룹은 차단한다. MVC interceptor와 `EndpointPermissionProvider` 계약을 통해 Host가 신뢰하는 인증 정보를 연결할 수 있다. UNMAPPED는 Runtime 차단하지 않는다.

## 검증

| 검증 | 결과 |
| --- | --- |
| `npm run lint` | 통과, 오류·경고 0 |
| `npm run build` | 통과, 기존 대형 bundle 경고 유지 |
| `npm run backend:test` | BUILD SUCCESS: 34건 중 29건 실행 통과, Failures 0, Errors 0, 조건부 PostgreSQL 5건 skip |
| `git diff --check` | 통과 |
| 브라우저 | 이번 checkout의 별도 Frontend 5177 / Backend 8097, H2 메모리 DB로 검증 |

새 Backend 테스트: 실제 Mapping 자동수집, 재수집 시 그룹/연결 보존, ACTIVE/STALE 전환, 다대다 공유, 그룹 검증·사용 중 삭제 거부·잘못된 그룹/Endpoint/Program 오류, UNMAPPED 기존 실행, Program 단독 권한, Program+그룹, 비활성 그룹, 공유 권한 혼합 방지, 실제 HTTP 403/200과 HEAD 요청.

브라우저: 1440×900 / 1280×800에서 TOP/BOTTOM 및 하단 좌우 Grid, Program 미선택 안내, 실제 Program 선택, 55건 자동수집/UNMAPPED, 그룹 `CUSTOM.APPROVE` 등록·서버 저장, Endpoint 연결·추가 그룹 연결·연결해제, 양방향 Drag, 방향키/Home 조절을 확인했다. 추가 그룹 연결은 서버 재조회에서 `GET /api/core/codes → CUSTOM.APPROVE` 저장값도 확인했다. 화면 증적은 작업의 outputs `COMMON-002-screen.png`에 보관했다. 검증 데이터는 임시 메모리 DB에만 존재한다.

## 미결사항 및 후속 항목

1. 기존 Backend에는 로그인·사용자 권한 원본이 없다. 기본 실행에서는 `EndpointPermissionProvider` bean이 없어 Runtime 실행을 유지한다. **운영 사용자 권한 통제 연결 완료가 아니다.** Host 인증을 연결해야 실제 사용자의 Program/그룹 권한을 집행한다. 신뢰되지 않는 요청 header나 Frontend ADMIN으로 권한을 만들어내지 않았다. Provider를 주입한 HTTP 통합 테스트에서는 차단/허용을 검증했다.
2. PostgreSQL V9 실DB 적용·검증은 수행하지 않았다. 외부 PostgreSQL 테스트 5건은 연결 조건이 없어 skip되었다. 기존 문서의 V7 checksum 불일치 이슈도 이번 작업에서 해결/우회하지 않았다.
3. Handler signature/조건 변경으로 식별자가 바뀌면 기존 항목은 STALE이고 새로운 항목은 재연결 검토 대상이다. 자동 Frontend Dependency Graph 매핑은 구현하지 않았다.
4. 기존 의존성 설치 결과 취약점 8건(중간 2, 높음 6)과 build의 큰 chunk 경고가 있다. 이 TASK와 무관한 의존성 업그레이드·번들 재설계는 하지 않았다.
5. Menu 관리, Role 전체 UI, SD 기능, UNMAPPED Runtime default deny, 인증 아키텍처 재설계는 제외했다.

## 변경 파일

- `frontend/src/pages/ProgramManagePage.tsx`
- `frontend/src/services/programApi.ts`
- `frontend/src/components/common/MasterDetailMultiGrid.tsx`
- `frontend/src/styles.css`
- `backend/src/main/java/com/caron/basekit/core/endpoint/ButtonGroup.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/ButtonGroupJpaEntity.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointCollector.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointController.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointData.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointJpaEntity.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointMapper.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointPermissionConfiguration.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointPermissionPolicy.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointPermissionProvider.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/EndpointService.java`
- `backend/src/main/java/com/caron/basekit/core/endpoint/ProgramEndpointJpaEntity.java`
- `backend/src/main/java/com/caron/basekit/core/program/ProgramExceptionHandler.java`
- `backend/src/main/java/com/caron/basekit/common/api/GlobalExceptionHandler.java`
- `backend/src/main/resources/mapper/core/EndpointMapper.xml`
- `database/migration/V9__program_endpoint_permission.sql`
- `backend/src/main/resources/db/migration/V9__program_endpoint_permission.sql`
- `backend/src/test/java/com/caron/basekit/core/endpoint/EndpointIntegrationTest.java`
- `backend/src/test/java/com/caron/basekit/core/endpoint/EndpointPermissionPolicyTest.java`
- `backend/src/test/java/com/caron/basekit/core/endpoint/EndpointPermissionRuntimeTest.java`
- `docs/decisions/033-program-endpoint-button-groups.md`
- `docs/basekit-current-status.md`
- `docs/tasks/common/COMMON-002-RESULT.md`
