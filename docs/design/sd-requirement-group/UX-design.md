# 요구사항 그룹 UX 재설계

2026-10-06 · DESIGN 설계/검토 Prototype 완료 · 제품 기능 미구현 · 상세 저장 정책은 SD 합의 전 제안

## 기준과 책임

- 제품 SoT: 원격 dev-pm `d1124d11bb636f466abffa65c9f29cad00ecebe3` (GitHub와 로컬 dev-pm HEAD 일치 확인).
- 작업 브랜치: design-work, 시작 원격 HEAD 및 작업지시 SHA `3825aebbb054d53a1d913bdd278c37c85c5ad512`.
- 필수 확인: dev-pm의 `AGENTS.md`, `README.md`, `docs/basekit-current-status.md`, `docs/01-architecture.md`, ADR-031/033, `docs/basekit-branch-integration-rules.md`; design-work의 `docs/design/DESIGN-role.md` 및 해당 작업지시.
- design-work는 dev-pm 대비 ahead 21 / behind 5의 분기 상태이다. 작업지시 파일은 design-work에 있고 브랜치 통합 규칙은 dev-pm에만 있다. 로컬 design checkout은 `57faf4c`이며 원격보다 이전이다. 로컬 checkout과 다른 작업자의 파일은 수정하지 않는다. 최신 dev-pm 소스 및 원격 파일을 기준으로 검토하고 DESIGN 문서/Prototype만 원격 design-work에 추가한다. 제품 소스 현행화 merge/cherry-pick은 이번 문서 작업에 포함하지 않는다.
- 관련 열린 PR은 조회 시 0건. 로컬 design tracked 변경 없음. 기존 중첩 baseKit/copilot-worktrees는 보존.
- 기존 Prototype: `G:/CARON/basekit-workroom/design/tasks/Prototype.html`, 관련 `UX.md`, `Review-2026-10-06.md`. 원본은 보존하고 본 폴더 `Prototype.html`을 후속 재설계본으로 등록한다.
- 기존 분석 설계: `docs/design/sd-requirement-analysis/SD-UX-wireframes.html`, `SD-UX-handoff.md`. 프로그램 후보 생성까지 다루는 이전 설계이며 이번 그룹 구성 메뉴의 구현 계약으로 사용하지 않는다.

이번 메뉴는 다음 설계에서 함께 볼 대표 REQUIREMENT_ID 목록을 사용자가 구성·확정한다. 업무 프로세스·화면·메뉴·Layout·Role/Action·Program 후보 생성은 다음 그룹 분석/설계 단계이다. API/DB/LLM, 제품 JSX/CSS, 공통 컴포넌트, 권한 모델은 변경하지 않는다. 일반 DESIGN 역할보다 이번 작업지시의 설계/Prototype 범위를 우선한다.

## 현행 → 문제 → 선택지 → 추천 → 영향

| 확인 대상 | 현행과 차이 | 재설계 |
|---|---|---|
| 기존 Prototype Toolbar | 행 추가 / AI 관련 요구사항 추천. 그룹 안의 기준 1건으로 즉시 추천 | 요구사항에서 추가 / Analysis에서 추가. 그룹 메뉴에서 분석 실행 없음 |
| 기존 AI 후보 | 단일 임시 응답, HUMAN/AI 표시, AI_ASSIST 이력 | 독립 Analysis 목록과 기준/실행시각/추천 사유, 여러 실행에서 누적 선택 |
| 기존 그룹 상태 | 작성중/확정만 제공 | 재검토 필요 추가, 포함 Requirement 변경 시 Gate 재오픈 |
| 근거 | 수정 가능한 포함 사유와 추가 방식만 있음 | 사용자 포함 사유와 원본 추천 사유를 분리 조회, Analysis ID로 추적 |
| 미저장 | 기본정보 적용과 구성 반영 단위가 다름 | 그룹 기본정보+구성 전체 초안, 그룹 저장 후 확정 제안 |
| 기존 검수 B02 | 사유 공백 오류가 모달 뒤에만 표시 | 모달 내부 필드 오류, aria-invalid/설명 연결과 focus 이동 |
| 제품 RequirementIntakePage | 연관정보는 업무관계/Traceability placeholder; AI 분석 탭 제거, 컴포넌트 KEEP | 포함 그룹 조회 및 이동 설계만 제공. 업무관계와 별도 영역 |
| 제품 analysisApi / ADR-033 | RESULT_VERSION/reanalyze/Program 후보 생성 계약 | 관련 요구사항 독립 추천 실행 계약으로 자동 재사용하지 않음 |

Analysis를 병렬 카드로 모두 펼치는 안은 작은 화면에서 정보가 과밀하다. 목록+선택 실행의 추천 Grid+누적 선택을 기본으로 하고, 필요할 때 같은 REQUIREMENT_ID의 사유를 나란히 행으로 비교하는 보조 모드를 추천한다. 이 결정은 UX 제안이며 독립 실행을 버전으로 해석하거나 최신 결과를 자동 채택하지 않는다. 신규 도메인 저장/대형 Architecture 변경은 SD/사용자 결정 후 구현한다.

## 기본 화면

프로젝트 Context를 PageHeader에 유지하고 ProjectListDetailWorkspace의 LIST / DETAIL / DETAIL_EXPANDED, splitter, 목록 접기/펼치기와 기존 Working Set을 재사용한다. 기본 30/70은 현재 Workspace의 기준을 따르며 Prototype의 CSS 비율을 새 표준으로 만들지 않는다.

좌측 목록 Grid: 그룹명(상세 이동), 요구사항 수, 상태, AI 활용 여부, 수정일. AI 활용은 **현재 포함 항목에 Analysis 출처가 1건 이상인지**로 표시하는 제안이다. 제거 후 이력이 필요한 경우 별도 이력에서 다루며 현행 목록 배지에 섞지 않는다. 검색/상태 필터가 상세 선택을 자동 변경하지 않는다. 검색 0건에서는 선택 상세를 유지하고 ‘현재 검색 결과에 없는 그룹’을 명시한다. 전체 그룹이 0건이면 상세도 빈 상태로 표시하고 그룹 추가만 제공한다.

우측 상단: 선택 그룹명, 그룹 설명, 그룹 상태, 포함 요구사항 수, 그룹 저장, 확정 그룹의 구성 수정. 상태를 자유로운 Select로 변경하지 않는다. 제목에 선택 그룹명을 표시하여 검색 밖 상세와 편집 대상을 식별한다.

우측 하단 Grid: 요구사항 ID / 요구사항명(상세 열기) / 요구유형 / 포함 사유 / 추가 출처 / Analysis 근거 / 변경 검토 / 제거. Requirement 업무 상태나 폐기 표시는 그룹 상태와 별도로 표시한다. Toolbar에는 두 추가 경로만 둔다. 포함 사유 수정은 사용자 판단만 바꾸며 추가 출처·원본 추천 사유는 유지한다. 제거는 현재 그룹의 포함 관계에만 적용된다.

그룹 저장은 기본정보와 구성의 전체 편집 초안을 저장하는 제안이다. 추가 모달에서 ‘그룹에 추가’는 초안 반영이고 영속 저장은 아니다. 버튼과 피드백에 이를 명시한다. 확정은 저장 성공·최신 검토 기준을 확인한 다음 별도 사용자 행동으로 수행한다.

## 직접 추가

‘요구사항에서 추가’ → 현재 프로젝트 전체 Requirement 검색 → 체크박스 복수 선택 → 누적 선택 검토 → ‘선택 N건 그룹에 추가’ → 초안 → 그룹 저장.

- 이름/ID 검색, 유형·설명·Requirement 상태 확인. 다른 그룹 포함은 선택 제한 근거가 아니다.
- 현재 그룹 포함/폐기/접근 불가 항목은 사유를 표시하고 선택 불가. 미저장 Requirement는 선택 목록에 포함하지 않는다.
- 현재 검색 결과 선택은 로드된 필터 범위의 유효 항목만 대상으로 하며 범위를 문구로 명시한다. 필터 밖 선택도 누적 선택 Grid에서 확인·해제한다.
- 기본 선택 0건. HUMAN → ‘직접 추가’, SOURCE_ANALYSIS_ID NULL. 기본 포함 사유 ‘사용자 직접 선택’은 Prototype 예시이며 제품의 필수 여부는 SD 결정.
- 사용자 최종 확인 전 그룹에 반영하지 않는다. 추가 후에도 자동 저장·자동 확정하지 않는다.

## Analysis에서 추가 / 비교

‘Analysis에서 추가’ → 독립 실행 목록 → 실행 선택 → 기준 Requirement·실행시각·추천 Requirement·사유 조회 → 일부 선택 → 다른 Analysis로 이동하여 선택 누적 → 최종 출처 확인 → 초안 반영.

기본 모달: 좌 Analysis 목록, 우 추천 Grid, 하단 누적 선택 Grid. 후보 Grid에도 제목/총건수/Toolbar를 적용한다. 기본 선택 0건이며 실행 전체 채택 버튼은 없다. Analysis를 바꿔도 basket은 유지된다. 검색은 후보를 필터링할 뿐 누적 선택을 지우지 않는다. 닫기/Escape는 누적 선택이 있으면 폐기 확인을 거친다.

‘Analysis 비교’에서는 같은 Requirement를 ID 순으로 모아 각 실행의 원본 사유를 읽고 비교한다. 각 행에는 실행 ID를 반복 표시하고 상단에서 기준 Requirement 맥락을 제공한다. 선택 출처는 하나를 명시적으로 결정한다. Prototype의 모든 실행 기준은 REQ-001 예시이며 제품은 실행마다 실제 기준을 표시해야 한다. 후보 총건수는 고유 Requirement 수, 비교 행 수는 별도 제안이며 둘을 혼동하지 않는다.

동일 REQUIREMENT_ID를 다른 실행에서 다시 선택하면 중복 행을 만들지 않는다. 기존 선택 출처/사유와 새 출처/사유를 비교하고 ‘기존 출처 유지’ 또는 ‘출처 변경’을 명시적으로 선택한다. 기존 그룹 포함 항목은 모달에서 비활성화한다. 그룹 저장 후 출처 변경/다중 근거를 지원할지는 미결정이다. 원본 추천 사유와 사용자 포함 사유는 별개이며 원문 전체를 그룹 데이터에 복제하지 않는다.

실패·진행·결과 없음인 Analysis도 실행 목록에 상태를 표시할 수 있으나 후보 선택 불가, 전체 목록을 성공 0건처럼 숨기지 않는다. 실패한 특정 실행의 상세 재조회가 다른 실행 basket을 지우면 안 된다. 접근 불가/삭제된 근거는 ‘근거 조회 불가’로 표시하고 그룹 항목을 자동 삭제하지 않는다. 관련 요구사항 추천 Analysis 생성은 별도 Requirement Analysis 책임이다.

## 상태 / Gate / 상세 연결

상태와 예외의 상세 정의는 `state-definition.md`, 흐름은 `screen-flows.md`를 따른다. 확정은 읽기 전용, 구성 수정은 명시적 작성중 전환, 재검토 필요는 변경 확인/구성 수정/영향 없음 판단 후 재확정한다. Requirement ID 관계와 과거 설계 산출물은 유지한다. 현재 대표 Requirement 내용을 보되 직전 검토 기준은 영향 비교 용도로만 사용하며 특정 버전 Requirement에 종속된 그룹으로 만들지 않는다.

Requirement 상세의 연관정보 아래 ‘이 요구사항이 포함된 그룹’ 조회 Grid를 추가하는 설계이다. 여러 그룹 표시, 상태/구성 수 조회, 해당 그룹 선택 상태로 관리 화면 이동을 제공한다. Requirement Relation/Traceability 탭을 대체하지 않는다. 신규 미저장 Requirement는 ‘저장 후 포함 그룹을 조회할 수 있습니다.’, 포함 0건은 그룹 관리 이동, 조회 실패는 재시도로 구분한다. 이동은 프로젝트/Requirement/대상 그룹 ID를 전달하는 제안이며 라우트는 미확정. 없는/접근 불가 그룹은 안내 후 이전 상세를 유지한다.

## 공통 규격과 접근성

| 영역 | 확인한 dev-pm 규격 / 재사용 | 적용 한계 |
|---|---|---|
| Context / Workspace | PageHeader, ProjectContextSelector, ProjectListDetailWorkspace | 제품 MDI/프로젝트 가드/기존 splitter 유지 |
| Grid | BaseKitDataGrid, field definitions/column adapter | native table는 Prototype 대역, 새로운 업무 Grid를 만들지 않음 |
| Title/총건수/Toolbar | grid-toolbar / grid-heading-group / grid-total / grid-actions | 최소 높이 38px, padding 4/8/3/12px, Title 13px, heading gap 12px, actions gap 5px, 버튼 28px: 현행 CSS를 따라야 함 |
| Modal | FormModal: 기본폭 min(620px,100%), header/footer 9/12px, body 14px | 비교 모달의 Prototype 1080px는 검토 표현. 넓은 모달 공통 지원은 COMMON 합의 전 제안 |
| 피드백 | BaseKitMessage, 필드 인접 오류, StatusColorIndicator | 색+텍스트, 오류 입력 연결, focus 이동 |
| 상세 연관정보 | BaseTabs + 조회 Grid | 그룹 편집은 관리 화면에서만 |
| Actions | ActionButton 및 기존 권한 연결 | 새 Action Code/권한 계약 임의 생성 금지 |

제품 공통 CSS의 값이 변경되면 최신 공통 규격을 우선한다. absolute/음수 margin/전용 고정 metric으로 제품 공통 구조를 우회하지 않는다. Prototype의 narrow breakpoint는 검토용이고 제품 breakpoint의 확정이 아니다. 1050 이하 한 열/600 이하 폼 한 열로 검토하되 Grid의 가로 overflow를 이름 있는 focus 가능 영역 안에 제한한다. 버튼/Modal footer는 줄바꿈하며 화면 밖으로 밀리지 않아야 한다.

모든 입력·체크·출처 선택에 접근 가능한 이름을 제공한다. native dialog는 초기 focus, 모달 안 Tab/Shift+Tab, Escape, 실행 버튼 복귀를 검토한다. 제품 FormModal 소스는 Escape를 지원하지만 focus trap/초기 focus/복귀를 구현했다고 간주할 수 없다. COMMON의 확인이 필요하다. Grid 재렌더링 시 활성 체크/focus를 유지하고 상세 이동 시 새 영역 제목으로 이동한다. 화면 이동 버튼에는 aria-current를 쓰고 실제 제품 탭에는 BaseTabs 규약을 적용한다.

## 산출물과 제한

`Prototype.html`, `screen-flows.md`, `state-definition.md`, `open-decisions.md`, `SD-implementation-handoff.md`, `verification.md`. Prototype에 모사한 신규 저장/검토 필드는 모두 디자인 예시이며 기존 DTO/API에 존재한다고 주장하지 않는다. 제품 build/lint/backend test는 제품 코드를 변경하지 않은 이번 작업의 완료 근거로 대체하지 않는다. 실 API/DB/LLM 및 제품의 해당 화면은 SD 구현 후 별도 검수한다.
