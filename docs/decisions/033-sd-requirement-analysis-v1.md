# 033. SD 요구사항 분석·Program 후보 V1

상태: 구현 완료(H2 검증). 실제 회사 LLM·승인 DB 검증은 미완료.
기준: DESIGN SHA `99bd96dfd2441184344045ed63186fdde6eeac3d`, `BASEKIT-SD-implementation-task.md`.

## 결정
- 저장 구조: Flyway V9 (`BSDAANLS`, `BSDAAREQ`, `BSDARSLT`, `BSDACAND`, `BSDAGREQ`, `BSDAGITM`, `BSDGPROG`, `BSDGPREQ`, `BSDGPMNU`). 작업지시서 명칭을 따랐으며 기존 `BSD*` 접두사 규칙과 다르므로 **명칭 확정 필요**.
- JdbcTemplate + 순수 SQL 사용. Requirement 스냅샷 의미를 유지하기 위해 BSDRREQ FK를 두지 않음.
- 입력 버전(INPUT_VERSION)은 요구사항 ID·MOD_DT·설계 의견·전체 의견의 SHA-256. 서버가 DB에서 재구성하며 MOD_DT 불일치는 409 `REQUIREMENT_VERSION_CONFLICT`.
- STALE: 입력 변경 시 영속 처리하고 비생성 후보의 선택·확정을 해제. 이전 결과는 참고용 표시만 하며 편집·확정·생성 불가. 재분석 시 RESULT_VERSION 증가, 후보는 선택 0건으로 시작.
- 결과 검증: JSON Schema + TEMP_ID 무결성·전이 연결성·Source 요구사항 소속·Layout/Component 화이트리스트. 원본 LLM 응답은 API로 노출하지 않음.
- 후보 편집은 ORIGINAL을 보존하고 EDITED를 별도 저장. 편집·선택 변경 시 확정 해제. 결과 버전 충돌은 409 `RESULT_VERSION_CONFLICT`.
- 생성: `GENERATION_REQUEST_ID` 멱등, 항목별 성공/실패, 동일 ID 재전송 시 실패 항목만 재시도. SD Program(+요구사항·Menu 연결)만 생성하며 MENU/ROLE/ACTION/Runtime/권한/DB Table/코드는 자동 생성하지 않음.
- 비동기 분석: Timeout 시 `ANALYSIS_UNKNOWN`, 늦은 응답은 attempt token 조건부 UPDATE로 폐기. 기동 시 ANALYZING/GENERATING 복구.

## 후속 필수 요건 (V1 미구현)
- 사용자 기반 동시 분석 Lock 미구현. 후속에서 **Requirement 단위 Lock(`BSDALOCK`)** 을 구현하고 **OWNER와 LOCK OWNER를 분리**해야 한다. 브라우저 UUID 기반의 가짜 Lock은 금지.