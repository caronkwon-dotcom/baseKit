# SD 프로그램 대장 V1 — 노트북 이전 인계

기록일: 2026-10-31. 재개 브랜치는 `sd-work`이며 `dev-pm` 통합은 별도 PM 단계다.

## 저장된 코드와 의존성

- 공통 V22 선행 migration: `623a616dc43568e23ac2dec5739ba8c237194e04`.
- SD 프로그램 대장 V1 제품 코드·테스트·V23: `3f3d49ef2641d3c2f68674fd6ed684ed47d29ce1`.
- V22는 `origin/common-work`의 `0af3ca3`에서 유래한 원본과 Git blob `33fdd8fb85ac26ca2021d9d2bb8859cdbdf9a3bf`가 같다. 공통 역할 구현 전체를 SD로 가져오지 않았다.
- PM은 공통 V22 선행 반영 여부를 확인하고 SD 제품 commit을 선택 통합해야 한다. 이미 같은 V22가 있으면 중복 반영하지 않는다.
- PR #40은 앞선 읽기 전용 설계 검토 범위로 병합됐다. 이번 프로그램 대장 작업은 PR40 이후의 별도 변경이다. 새 PR 생성·병합은 이 인계 작업에 포함하지 않는다.

## 새 노트북 재개

1. 저장소를 받은 뒤 기존 작업 구조에 맞춰 `sd-work`를 사용한다. `AGENTS.md`, `docs/recovery-guide.md`, 이 문서와 `docs/basekit-current-status.md`를 먼저 확인한다.
2. Java21, Node20.19 이상(또는22.12 이상), PostgreSQL을 준비한다. `npm ci --prefix frontend`로 의존성을 설치한다.
3. 기존 DB와 첨부 파일은 Git으로 이전되지 않는다. 이전 노트북의 DB 백업과 `backend/data/`를 별도 보관·이전한다. 새 DB를 임의 생성한 뒤 기존 데이터가 복구됐다고 판단하지 않는다.
4. 승인된 DB 복원 후 Flyway 이력을 확인한다. V22는 `create_role`/checksum `-1664499172`, V23은 `sd_program_register`/checksum `1137077725`다. 기존 적용 migration이나 이력의 수정·삭제·repair·임의 재실행을 하지 않는다.
5. DB·LLM 접속정보는 별도 로컬 환경변수로 설정한다. 비밀정보를 저장소에 넣지 않는다. `.workroom.local.json`과 작업방의 CURRENT/TASK도 로컬 설정이므로 이전 작업장 경로를 점검한다.
6. DB 검증 후 저장소의 `npm run backend:run -- -Dspring-boot.run.profiles=sd`, `npm run dev:sd`로 실행한다. FE5176 → BE8083 연결을 확인한다.
7. `/baseKit/#/standard-design/screens`에서 대상 프로젝트를 선택해 후보 조회·등록·수동 추가·수정 저장·새로고침·중복 방지를 확인한다.

## 검증 이력과 한계

2026-10-27 실제 공유 PostgreSQL에서 V23 성공, 5176→8083 연결, AI 후보 등록→이름/설명 저장→새로고침 유지, 수동 추가·중복409를 실측했다. 기존 프로그램2건을 보존하고 검증용2건을 추가했다. 당시 그룹19/분석43/요구사항163 및 프로그램·근거 외43테이블 내용이 검증 전후 동일했다. 당시 원본 시작 콘솔 로그는 확보하지 못했고 실행 프로세스·API·DB·Flyway validate 로그로 확인했다. 이는 해당 날짜의 결과이며 새 노트북 실행 상태를 뜻하지 않는다.

2026-10-31 원격 보존 전 재검증: build/lint 통과, Frontend136/136, Backend94건 중82통과·조건12skip·실패0, diff검사 통과. 외부 PostgreSQL 테스트 환경변수는 제거하고 격리 H2에서 실행했다. 기존 xlsx import/번들 크기 경고는 유지한다. 공유 DB migration이나 서버 재기동은 이번 원격 보존 작업에서 수행하지 않았다.

## 별도 이전할 로컬 자료

- `backend/data/`: Git 미추적 첨부 파일. 이번 커밋에서 제외하고 원본 보존.
- 10월27일 DB 백업·실측 보고서·화면 증빙: 이전 노트북의 `G:/CARON/codex-default/2026-10-27/referenced-chatgpt-conversation-this-is-an-5/outputs/`.
- `basekit-20261027.dump`: V23 적용 전 전체 백업, 196344바이트. SHA256 `8A804523F18639DF0CC2C2FCC7DF2F6391A13A2D5182966F53BD949CE70AFB45`.
- `basekit-post-v23-before-final-verification.dump`: V23·기존 AI2건 포함 백업, 198411바이트. SHA256 `E3D272D18F116732778FC2B1F6893362419E02D4B658CBE7EB0673D54D27E6BD`.
- 위 백업은 10월27일 시점이며 그 이후의 변경은 포함하지 않는다. 이전 직전 현재 DB 백업이 필요한 경우 기존 복원본과 구분해 새로 보관해야 한다.