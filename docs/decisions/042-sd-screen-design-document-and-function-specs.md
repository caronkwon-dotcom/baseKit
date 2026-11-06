# ADR 042: SD 화면 설계서(HTML) 출력과 기능 요건

- 일자: 2026-11-06
- 상태: PM 추천안 승인(TASK SD-SCREEN-002), ai-sd 구현·로컬 검증 완료, dev-pm 통합 전
- 관련: [ADR 041](041-sd-screen-design-menu.md)

## 결정
1. **기능 요건 저장**: 별도 테이블·migration 없이 기존 `DESIGN_JSON`(TEXT)을 확장한다. `SCHEMA_VERSION`(기존 1, 저장 시 2), `FUNCTION_SPECS[]`(`FUNCTION_ID`, `NAME`, `ACTION_CODE`, `DESCRIPTION`, `RULES[]`, `VALIDATIONS[]`, `ACCEPTANCE[]`, `REQUIREMENT_IDS[]`, `SOURCE`), 검색조건 `RULE`, 상세 항목 `READONLY_YN`을 추가했다. `FUNCTION_ID`는 `FN-nn`(최대+1, 재사용 안 함)이다.
2. **서버 검증**: `FUNCTION_ID` 필수·유일, `NAME` 1~100자, `ACTION_CODE`는 허용 코드이면서 그 설계의 `ACTION_CODES`에 있어야 한다. `REQUIREMENT_IDS`는 프로그램 근거 요구사항(`BSDGPREQ`)에 있는 값만 허용한다. 배열 최대 20건·항목 500자·설명 2000자·기능 50건. 서버는 모르는 키를 저장하지 않으므로 **백엔드를 먼저 배포**한다.
3. **하위 호환**: 버전 1 설계는 그대로 열리고(기능 요건 빈 목록, `RULE` 빈 값, `READONLY_YN` N) 저장하면 버전 2가 된다.
4. **AI 초안**: 같은 호출에서 기능 요건 초안도 만든다. 근거에 없는 요구사항 ID와 설계에 없는 `ACTION_CODE`는 제거·비우고 `WARNINGS`로 알린다. 자동 저장하지 않고, 최대 출력 토큰 기본값을 4000에서 8000으로 올렸다(`standard-design.screen-design.max-output-tokens`).
5. **누락 후보**: 어떤 기능에도 연결되지 않은 근거 요구사항은 경고만 한다(확정·출력을 막지 않음). 기능 요건이 없는 설계도 확정·출력할 수 있고 경고와 문서 안내를 표시한다. 초안 설계도 출력할 수 있으며 표지에 "초안 · 현업 검토 전"을 표시한다.
6. **출력**: 새 API 없이 프런트 순수 함수 `renderDesignDocument`가 단일 정적 HTML을 만들고 Blob으로 내려받는다(`UI-SDPG-{프로그램ID 8자}-V{설계버전}.html`). 외부 리소스 없음, CSP로 외부 로딩 차단, 모든 텍스트 이스케이프, 설계 JSON은 스크립트가 아니라 이스케이프된 텍스트로 포함한다. 스크립트는 복사·인쇄·검토 판정 집계에만 쓰며 데이터는 스크립트에 들어가지 않는다. 프롬프트·모델 원문·내부 URL은 문서에 넣지 않는다.
7. **Part B 지침**: 화면 유형별 고정 템플릿 5종(AI가 쓰지 않음). 공통 Tree 컴포넌트가 없어 `TREE_DETAIL`은 "사전 보고 필요"로 표기한다.
8. **현업 검토**: 문서 안의 검토표를 인쇄·PDF로 회수한다(시스템 저장 없음). `REVIEW` 상태는 추가하지 않는다.
9. **버튼**: 모듈 전용 Action `SD_SCREEN_DOC_EXPORT`("설계서 출력")를 오른쪽 상단 툴바 5번째에 두고, 저장된 설계가 있고 미저장 변경이 없을 때만 활성화한다. `ActionButton`에는 전용 아이콘이 없어 대시(−)로 표시된다.

## 미결정·후속
프로젝트 전체 설계서, 검토 의견 시스템 저장·`REVIEW` 상태, 공통 `ActionButton` 아이콘, 문서 서버 보관(이력), 실제 회사 LLM 응답 품질 검증.
