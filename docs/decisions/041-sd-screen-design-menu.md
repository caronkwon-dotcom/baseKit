# ADR 041: SD 화면 설계 메뉴 (프로그램 목록 ↔ UI 설계)

- 일자: 2026-11-06
- 상태: PM 추천안 승인(TASK SD-SCREEN-001), ai-sd 구현·로컬 검증 완료, dev-pm 통합 전
- 관련: ADR 017, 018, 039, 040. 공모용 `/contest` 재사용을 전제로 한다.

## 결정
1. **저장 모델**: 프로그램 1건당 화면 설계 1건(현재 버전만)을 `BSDSCRN`(V29)에 저장한다. 상세는 `DESIGN_JSON`(`SCREEN_TYPE`, `SEARCH_FIELDS[]`, `GRID_COLUMNS[]`, `DETAIL_FIELDS[]`, `ACTION_CODES[]`)이고 `PROGRAM_ID`는 유일하다. 상태는 `DRAFT`/`CONFIRMED`, 낙관적 잠금은 `VERSION`(저장·확정마다 증가), `PROGRAM_VERSION`은 저장 시점의 프로그램 버전을 기록만 한다(불일치 표시는 이번 범위 제외). 테이블 이름은 `SD_SCREEN_DESIGN`(프로그램 키)과의 혼동을 피하려고 `BSDSCRN`으로 했다. `basekit` 계정으로 CREATE만 한다(ADR 040).
2. **API**: `/api/standard-design/projects/{project}` 아래 `GET /screen-designs`(프로그램별 상태), `GET|PUT /programs/{id}/screen-design`, `POST …/confirm`, `POST …/ai-draft`. 확정된 설계를 저장하면 `DRAFT`로 돌아간다. 서버가 필수값·중복 `FIELD_ID`·허용 값·`ACTION_CODES`를 검증한다.
3. **AI 초안**: Browser는 LLM을 호출하지 않고 Backend 경계(`DesignLlmClient`)만 쓴다. 응답은 서버가 파싱·검증하며 모델이 말한 `SOURCE`는 무시하고 `AI`로 표시한다. 실패하면 오류만 돌려주고 기존 편집·저장 내용은 그대로 둔다. **자동 저장하지 않는다.** 프롬프트와 모델 원문은 DB에 저장하지 않고 로그에는 크기만 남긴다(요구사항 스냅샷에 고객 정보가 있을 수 있음).
4. **설계 대상**: 프로그램 대장의 모든 프로그램이다(그룹 확정 여부와 무관, 수동 추가 포함). 그룹명은 기존 그룹 목록 API와 클라이언트에서 맞춘다.
5. **프로그램 대장 분리**: `ProgramRegister`를 독립 프로그램 `SD_PROGRAM_REGISTER`(`/standard-design/programs`, 메뉴 "프로그램 대장", V30 시드)로 분리했다. 화면 설계의 "프로그램 등록" 버튼은 이 화면으로 이동한다. 기존 브라우저 저장 방식 화면 설계와 회사 LLM 연결 확인은 삭제하지 않고 화면 하단 접힘 영역에 유지한다.
6. **Action**: 모듈 전용 `SD_SCREEN_AI_DRAFT`를 선언하고 `SD_SCREEN_DESIGN`에 `SAVE`, `REVERT_CHANGES`, `APPROVE`와 함께 권한 행을 추가했다. `ActionButton`에 전용 아이콘이 없어 AI 초안·설계 확정은 대시(−) 아이콘으로 표시된다(공통 수정은 별도 요청 사항).
7. **구조**: 화면 본문은 `modules/standard-design/screen-design/ScreenDesignWorkspace`(프로젝트 ID를 prop으로 받음)이고 라우트 처리는 `ScreenDesignPage`가 한다. 순수 로직은 `screenDesign.ts`.

## 미결정·후속
- 프로그램 근거 변경 시 설계 불일치 표시, 공통 `ActionButton` 아이콘 추가, `/contest` 화면.
- 실제 회사 LLM 응답 품질은 실호출로 검증하지 못했다(테스트는 모의 응답).
