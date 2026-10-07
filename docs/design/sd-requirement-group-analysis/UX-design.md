# 요구사항 그룹 관리 — 분석 TAB UX

2026-10-07 · DESIGN 설계/Prototype · SD 구현 계약 확정 전 제안

## 기준과 작업 경계

- 저장소 `caronkwon-dotcom/baseKit`, 작업 브랜치 `design-work`.
- 시작 최신 origin/dev-pm: `a2c60889036a0275dfdef3a62b7a6df6393c1c64`.
- 시작 design-work / 작업지시: `618e94ce5d05a6a7fd506916025f9b7989f249e3`.
- 필수 확인: AGENTS, README, 현재 상태, Architecture, ADR 033/034, dev-pm의 브랜치 통합 규칙, DESIGN-role, 이번 작업지시.
- 기존 그룹 Prototype `693eaf1084abd73ab2482da469145756e8daf897`, 그룹 UX/state/flows/인계 `81bf8896cf8cb24c87116fdd03d8100bbff1e26a`를 재사용했다. 기존 Requirement Analysis `SD-UX-wireframes.html`, `SD-UX-handoff.md`, `UX-review.md`의 5개 결과 영역과 검수 이력도 확인했다.
- origin/dev-pm에서 실제 `RequirementGroupPage`, 그룹 API/ADR 034, `RequirementAnalysisPanel`, BaseTabs, FormModal, styles/grid CSS를 확인했다. 관련 열린 design-work PR은 조회 시 0건. 시작 checkout clean.

design-work는 제품 SoT보다 오래된 코드와 DESIGN 내부 이력이 함께 있는 분기다. 원격 최신 dev-pm을 별도 detached 검증 checkout으로 확인했다. 이번 사용자 지시는 Prototype/설계이며 제품 UI 수정이 필요하면 검토 후 인계로 분리하므로, 제품 소스를 동기화하는 전체 merge/rebase를 수행하지 않았다. 현행화는 최신 제품 소스 대조로 수행했고 design-work 제품 checkout 자체는 갱신하지 않았다. SD 구현 시작 시 최신 dev-pm에서 작업해야 한다. 내부 산출물만 design-work에 남긴다.

## 현행 구조 → 문제 → 선택지 → 제안 → 영향

현행 그룹 화면은 `MasterDetailMultiGrid`의 좌 그룹 목록과 우 기본정보/포함 Requirement Grid다. `BaseTabs`는 다른 상세 화면에 있지만 그룹 화면에는 없다. 기본정보의 ‘Analysis에서 추가’는 독립 **Requirement 추천 근거 조회**이며, 이번 **그룹 설계 분석** 실행/결과와 다른 기능이다. 기존 Program Analysis API는 같은 ID의 RESULT_VERSION 재분석·후보 확정·생성까지 포함하여 이번 독립 이력 의미와 다르다.

별도 메뉴는 그룹 재선택을 요구하고, 모든 결과를 한 화면에 펼치면 이력/본문이 과밀해진다. 제안은 기존 우 Detail 안에 `[기본정보] [분석]`을 두고, 분석의 상단 이력 Grid와 하단 선택 결과, 결과 내부 5개 TAB을 사용한다. 신규 메뉴·Program·권한·API를 등록하지 않는다. 최종 제품 구현은 우 Detail의 두 기존 영역을 하나의 BaseTabs 컨테이너로 감쌀 공통 연결점이 필요한지 COMMON/SD가 확인한다. Prototype wrapper는 제품 공통 레이아웃 변경의 승인이 아니다.

## 선택 Context와 기본정보 책임

TAB 위에 프로젝트, 선택 그룹 ID/이름, 그룹 상태, 포함 건수를 항상 유지한다. 기본 진입은 기본정보이며 그룹 전환 시 현재 TAB은 유지한다. 그룹별 마지막 선택 Analysis를 기억하되 다른 그룹의 결과는 표시하지 않는다. 처음 분석 진입에서는 가장 최근 조회 가능한 결과를 초기 선택할 수 있지만 ‘최신=최적’ 또는 이전 결과 대체로 해석하지 않는다. 새 실행을 사용자에게 접수한 경우 그 새 RUNNING 행을 선택한다.

TAB 전환은 그룹이나 편집 초안을 버리지 않는다. 기본정보의 미저장 변경이 있으면 분석 이력 조회는 허용하고 실행은 차단한다. 저장·확정 또는 변경 폐기는 기본정보 책임이다. 그룹/프로젝트 이동에는 현행 미저장 보호를 그대로 적용한다. 검색 0건이어도 선택 Detail을 유지하며 ‘현재 검색 결과에 없는 그룹’을 표시한다. 새 그룹/그룹 미선택은 실행 불가다. 프로젝트 변경은 그룹별 선택 캐시를 해당 프로젝트와 함께 분리한다.

그룹명/설명/Requirement 추가·제거/포함 사유/근거 추가/변경 검토/재확정은 기본정보에만 둔다. 분석 TAB의 기본정보 이동 링크는 TAB 전환일 뿐 변경 행동이 아니다. 기존 직접 추가·추천 근거 선택 흐름은 보존했다. 기존 그룹 Prototype의 폐기 항목 제거 필수 제안은 **현행 ADR 034의 폐기 항목 유지·재확정 허용 계약보다 우선하지 않는다**. 이번 수정은 그 이전 그룹 전체 설계를 다시 확정하는 작업이 아니다.

## 실행 Gate 및 입력 Snapshot

| 현재 그룹 | 새 분석 실행 | 안내 / 이동 |
|---|---|---|
| DRAFT | 비활성 | 요구사항 그룹을 먼저 확정해 주세요. → 기본정보 |
| REVIEW_REQUIRED | 비활성 | 포함된 Requirement가 변경되었습니다. 그룹을 재검토 후 다시 확정해 주세요. |
| CONFIRMED + 저장된 최신 구성 | 가능 | 새 분석 실행 → 입력 확인 Modal |
| 미저장/조회 불가/접수 여부 불명 | 비활성 | 각각 저장·확정 / 재조회 / 요청 상태 확인 |

Modal은 GROUP_ID/NAME/DESCRIPTION, 프로젝트, 포함 Requirement 총건수와 ID/이름/Revision/내용/설계 의견/폐기 표시를 읽기 전용으로 제공한다. 긴 구성은 모달 본문 Grid 안에서 스크롤한다. ‘기본정보로 이동’, ‘취소’, ‘분석 실행’을 제공한다. 실행 버튼을 누르기 전에는 실행 이력을 생성하지 않는다.

사용자가 확인한 입력을 실행 직전 서버에서 다시 검증하는 SD 계약이 필요하다. 상태/구성/Revision/설계 의견 변경은 실행하지 않고 최신 그룹 검토로 유도한다. 조용히 최신 입력으로 바꾸거나 오래된 확인을 자동 승인하지 않는다. 실행이 접수되면 그 Snapshot은 불변이고 이후 그룹 변경은 과거 결과를 수정하지 않는다. Prototype MOD_DT 정수는 Revision 대역이며 실 제품 REQUIREMENT_REVISION과 혼동하지 않는다.

접수 거절은 Modal과 입력을 유지하고 재시도를 제공한다. 응답 유실은 동일 요청의 접수 상태를 확인해야 한다. Prototype에서는 접수된 RUNNING 예시를 보여주며 새 실행을 잠근다. 실제 응답에 ID가 없을 때는 로컬 ‘접수 확인 중’ 표기와 요청 식별자를 사용해야 하며 ANALYSIS_ID를 임의 발급하지 않는다. 요청 멱등키/조회 계약은 SD 미결정 사항이다.

## 이력과 결과 검토

이력 Grid는 Analysis ID, 실행시각(사용자 표시 시간대), 상태, 입력 기준·건수를 최신 실행시각 순으로 제공한다. ‘분석 이력 / 총 N건’과 Toolbar의 이력 새로고침·Analysis 비교·새 분석 실행을 유지한다. 단순 선택은 조회이며 검토완료로 자동 전환하지 않는다. 이력은 페이지 처리할 수 있으나 선택 결과를 바꾸거나 전체 이력을 ‘최근 1개’로 제한하지 않는다.

RUNNING은 실행 중 문구·상태 조회, FAILED는 사용자용 실패 사유·현재 입력 확인 후 **새 독립 분석** 재시도, REVIEW_REQUIRED는 생성 결과 조회·명시적 검토완료, REVIEWED는 검토 표시/시각을 제공한다. 기존 Analysis를 같은 ID의 새 결과로 교체하지 않는다. 검토완료는 최종 설계 확정·전체 채택·자동 반영이 아니다. 검토 저장 실패 시 이전 상태를 유지한다.

그룹 변경 여부는 실행 상태와 별개다. 과거 Snapshot이면 ‘현재 그룹 구성 이전의 입력 기준으로 수행된 분석입니다.’를 표시하되 기존 REVIEWED/REVIEW_REQUIRED/FAILED/RUNNING을 바꾸지 않는다. 과거 완료 결과의 조회·사람의 검토·병렬 비교는 허용하고 최신 그룹으로의 새 실행만 Gate로 제어한다. 이름/설명/구성 ID/Revision/설계 의견이 입력 동일성 판단 대상이며 서버의 canonical 입력 signature를 사용하도록 인계한다.

| 결과 TAB | 읽기 구조 | 사용자 판단에 필요한 근거 |
|---|---|---|
| 요약 | 핵심 제안, 적용 범위, 입력 요약 | 입력 ID/Revision, 사람 판단 안내 |
| 업무구조 | 업무·메뉴·역할·Action 제안 | 책임과 Requirement 출처; 시스템 권한 생성 없음 |
| 프로세스 | 정상 순서·분기·예외·전이 근거 | Requirement 출처와 검토할 전이 |
| Layout 추천 | 기존 Layout/Component 패턴 Grid | 추천 근거, 공통 컴포넌트 매핑, 출처 |
| Program 후보 | 후보명·업무 책임·출처 Grid | 후보 제안만 조회; 생성/편집/전체 채택 없음 |

긴 텍스트는 줄바꿈하고 Grid는 이름 있는 focus 가능 영역 안에서 가로 스크롤한다. 영역에 결과가 없으면 ‘이 영역에 제안된 내용이 없습니다’를 표시한다. 완료인데 전체 결과가 없는 경우 조회 오류/불완전 결과로 표시하고 재조회하며 빈 이력으로 숨기지 않는다. 악성 원문은 텍스트로 표시하고 임의 HTML/코드를 실행하지 않는다.

## 비교 V1

이력 Toolbar ‘Analysis 비교’에서 같은 그룹의 결과가 있는 완료 Analysis 2건을 선택한다. 기본 쌍은 현재 선택 완료 결과 + 다른 최근 완료 결과다. 같은 ID/다른 프로젝트·그룹/RUNNING/FAILED는 선택 불가다. 상단 양쪽 ID/시각/상태/입력 Snapshot 버튼을 고정하고 공통 영역 TAB을 바꾸면 두 결과가 같은 영역으로 전환된다. 비교 대상은 요약·업무구조·프로세스·Layout 추천·Program 후보·각 근거다.

입력 Snapshot이 다르면 입력 차이가 결과 차이를 만들 수 있음을 안내한다. V1은 병렬 읽기이며 자동 Diff·병합·추천 순위·자동 채택을 하지 않는다. 같은 입력에서도 LLM의 다른 제안을 사람이 판단한다. 넓은 화면은 2열, 좁은 화면은 위/아래로 제공한다. 큰 전용 Modal 대신 우 Detail 안의 비교 화면을 제안하여 FormModal 폭 확장 의존성을 줄였다. 비교 종료 시 이전 선택 Analysis로 복귀한다. 한쪽 조회 실패는 그쪽에 재조회만 제공하고 다른 결과와 선택 쌍을 유지한다.

## UI 규격과 접근성

제품 구현은 PageHeader/ProjectContextSelector, 현행 MasterDetailMultiGrid(실제 그룹 화면), BaseTabs, BaseKitDataGrid, ActionButton, FormField, FormModal, BaseKitMessage를 우선한다. 이전 문서의 ProjectListDetailWorkspace 제안보다 현행 제품 구조가 우선한다. 공통 Toolbar 최소 38px/padding 4px 8px 3px 12px, heading gap 12px, Title 13px/총건수 12px, action gap 5px/버튼 28px, BaseTabs 최소 32px/padding 5px 12px/본문 위 10px을 확인했다. 제품에서 CSS 값을 다시 정의하지 않고 최신 공통 스타일을 사용한다.

Prototype의 table/dialog와 별도 CSS는 DESIGN 대역이다. 신규 디자인 시스템·업무 전용 absolute/음수 margin은 제안하지 않는다. 1050px 이하는 검토용 1열 전환이며 제품 breakpoint의 확정 값이 아니다. 실행 확인은 현행 FormModal 기본폭을 사용한다. 페이지/결과/비교 Title과 총건수는 현행 표준에 매핑한다.

TAB은 label/tabpanel 관계, 방향키/Home/End와 focus 이동, Modal은 초기 취소 focus/Tab 순환/Escape/trigger 복귀를 검토했다. 실제 BaseTabs에는 키보드 순환 구현이 없고 FormModal의 focus 관리는 현행 그룹 화면이 보완한다. Prototype 통과가 공통 구현 완료를 의미하지 않으며 COMMON 의존성을 인계한다. 색과 상태 텍스트를 함께 제공하며 비활성 행동의 이유는 항상 보이는 문구로 설명한다.

상태별 정의는 `state-definition.md`, 흐름은 `screen-flows.md`, 미결정 계약은 `open-decisions.md`, 구현팀의 순서와 제외 범위는 `SD-implementation-handoff.md`, 증거는 `verification.md`를 따른다.
