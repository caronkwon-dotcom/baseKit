# 요구사항 샘플 노출 수정 (2026-10-16)

## 원인과 출처
- `G:/CARON/codex-default/work/sd-overview-ui-fixture.mjs`가 `const project='SDP-002'`로 합성 문구점 요구사항 5건과 그룹을 실제 로컬 PostgreSQL에 복사했다. 생성시각은 2026-10-09 11:14:50 UTC이다. 합성 원본은 같은 폴더 `sd-overview-synthetic.mjs`이다.
- 근거: workroom `sd/tasks/overview-observations/ui-fixture.json`의 프로젝트 SDP-002, 그룹 RG-cba480b0c5d044e6836ef8b2cb6f5d78, count=5와 API ID/내용 일치. repo의 seed/migration/test fixture에 해당 문자열 없음.
- 조회 API/Mapper는 PROJECT_ID 필수 검증과 동등 비교를 사용한다. NULL은 DDL NOT NULL이며 기본 PROJECT_ID가 없다. 다만 서버 프로젝트 master FK는 없고 프로젝트 메타데이터는 브라우저 localStorage에 있다.
- 브라우저별 SDP 순번 재사용으로 다른 브라우저/삭제 후 신규 프로젝트가 기존 서버 요구사항과 동일 ID를 사용할 잠재 문제가 있다. 신규/복사 생성은 UUID 기반 SDP ID로 변경했다. 기존 ID와 데이터는 변경하지 않는다.
- 프로젝트 생성 시 요구사항 자동 생성, API 실패 시 mock 대체 또는 문구점 fixture 주입은 없다. 레거시 initialData의 표준용어 요구사항은 별도 브라우저 데이터이며 현재 요구사항 API 목록에 자동 이관되지 않는다.

## 삭제 정책과 수정
- DELETE는 물리삭제가 아니라 DISCARDED_YN=Y 폐기이다. 첨부, 그룹 구성, Analysis 근거와 Revision을 보존하고 포함 그룹을 재검토 대상으로 전환한다.
- 문제의 5건 중 3건은 이미 Y였으므로 폐기 버튼이 비활성화되었다. FK/샘플 보호로 DELETE가 실패한 증거는 없으며 목록에 폐기 행을 계속 보이던 동작이었다.
- 기본 목록에서 폐기 항목을 제외하고 `폐기된 요구사항 포함` 선택으로 다시 조회한다. 프로젝트 전환 중 다른 프로젝트 행은 폐기하지 못하도록 현재 선택행도 확인한다.
- PROJECT_ID 누락 시 500이던 응답을 기존 서비스의 명시적 400 검증으로 연결했다.

## DB 복구
- 일회성 SQL: `database/repair/quarantine-overview-ui-fixture.sql`. 자동 Flyway migration이 아니며 트랜잭션에서 명시적으로 실행한다. PostgreSQL에서는 `psql --set ON_ERROR_STOP=1 --single-transaction --file database/repair/quarantine-overview-ui-fixture.sql` 형태로 적용 가능하다.
- 알려진 5개 ID/명칭과 전용 그룹 ID를 검사하고 다른 그룹/추천/메뉴 연결이 있으면 중단한다. 테이블 잠금 아래 그룹 구성만 임시 보관 후 재삽입하여 복합 FK를 보존한다. 재실행은 무변경이다.
- 실제 로컬 DB에 rollback 예행 검증 후 적용 완료. SDP-002: 27→22건, 문구점 0건. DEMO-OVERVIEW-UI-20261009: 문구점 5건과 그룹 1건/구성 5건. ID/상태/Revision/시각/첨부/과거 Snapshot JSON은 보존했다. 실제 요구사항 22건은 수정하지 않았다. 스키마 변경 없음.
- 원인 스크립트의 고정 SDP-002도 매번 고유한 DEMO-OVERVIEW-UI UUID로 변경했다(저장소 외부 운영 검증 스크립트).

## 검증
- frontend build/lint, node tests 61/61 통과. 기존 bundle 크기 경고만 유지.
- backend 전체 65건 중 60 통과/5 skip, 실패 0. 새 프로젝트 빈 조회, 다른 프로젝트 격리, 등록/조회, PROJECT_ID 누락 400, 반복 폐기 멱등성과 상태 보존 테스트 추가.
- 수정 sd-work 화면 5176에서 프로젝트 생성 → UUID 발급 → 요구사항 0건 → 신규 저장 1건 확인. 별도 검증 프로젝트 SDP-5c4b6ae7-617b-43c3-940f-a5f1902c8c47를 사용했다.
- 실제 API에서 검증 요구사항 REQ-05A021E0-784 폐기 204 및 Y 확인. 브라우저 confirm 창 제어가 멈춰 폐기 완료 화면 조작은 제한됐다. 전용 검증 프로젝트의 폐기 데이터 1건은 보존한다.
- 실제 API에서 SDP-002 22건/문구점0, 데모5건/멤버5건 및 SQL 재실행 dry-run 무변경 검증.

## Git/남은 제한
- 기존 G:/CARON/basekit/sd / sd-work만 사용. 신규 branch/worktree 없음. origin/dev-pm 751d914가 HEAD에 포함된 상태에서 시작. 직접 dev-pm/main 수정/merge 없음.
- 수정 프론트는 5176에서 검증했으며 5173 PM 서버의 코드 배포/재시작은 하지 않았다. DB 격리는 현재 로컬 DB에 반영되어 있다. 다른 DB 환경에는 명시적 복구 SQL 적용이 필요하다.
- 프로젝트 master의 서버 영속화는 별도 과제이며 UUID는 현재 브라우저 저장 구조에서 ID 재사용을 방지한다. 데모 ID는 일반 브라우저 프로젝트 목록에 등록하지 않았다. 분석 원본 JSON에는 역사적 SDP-002 문구가 그대로 남는다.
