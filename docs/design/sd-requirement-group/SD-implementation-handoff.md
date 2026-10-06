# SD 개발팀 구현 인계안 — 요구사항 그룹

2026-10-06 · DESIGN 설계 산출물 · 제품/API/DB/LLM 구현 없음

## 시작 기준과 참고

제품 SoT dev-pm `d1124d11bb636f466abffa65c9f29cad00ecebe3`, 작업지시 SHA `3825aebbb054d53a1d913bdd278c37c85c5ad512`. 관련 Prototype/흐름/상태/미결정 사항은 동일 폴더 문서를 참조한다. 최신 제품과 design-work의 divergence를 기록했으며 기존 제품 UI를 원복하거나 전체 merge하지 않았다. 다음 구현 시작 시 origin/dev-pm을 다시 확인하고 작업 단위 제품 commit만 선택 통합한다.

이번 그룹은 다음 설계 Context의 Requirement 목록을 사용자에게 확정시키는 기능이다. 기존 RequirementAnalysisPanel/analysisApi/ADR-033은 Program 후보 생성 분석이며 보존한다. RESULT_VERSION 기반 재분석을 독립 Requirement 추천 실행으로 재해석하거나 기존 API에 후보 Requirement 필드가 있다고 가정하지 않는다. 실제 관련 Requirement Analysis API/그룹 API/영속 모델은 확인되지 않았다.

## 구현 작업 단위

1. **업무 계약 확정:** `open-decisions.md` D01~D06/D08/D10. 그룹 CRUD/구성 저장·조회, 독립 추천 Analysis 조회, 포함 그룹 조회, 검토·확정/동시성/변경 감지 계약을 SD가 작성한다. API 경로·테이블·Migration·상태 코드·새 Action Code는 이 설계에서 등록하지 않았다.
2. **그룹 관리 화면:** 기존 프로젝트 Context와 Workspace, Grid/Toolbar/Title/총건수 재사용. 좌 목록+우 기본정보+우 포함 Grid. 검색 밖 선택·전체 없음·필터 없음 구분. 초안 저장/확정 구분, read-only 확정, 명시적 구성 수정.
3. **직접 추가:** 저장된 동일 프로젝트 Requirement 검색, 기본 선택 0, 검색 밖 선택 유지, 현재 포함 비활성, 타 그룹 포함 허용, 누적 확인 후 초안 반영.
4. **Analysis 추가:** 독립 실행 목록·기준·시각·상태, 추천 항목/원본 사유, 일부 선택·여러 실행 누적·출처 비교/명시 결정, 최종 확인 후 초안 반영. 그룹 화면에서 분석을 실행하거나 그룹 자동 생성/확정하지 않는다.
5. **근거/사유:** 그룹 Grid는 HUMAN을 직접 추가로 표시하고 Analysis ID 근거 조회를 제공. 사용자 사유 수정과 원본 추천 사유를 분리, 동일 그룹의 REQUIREMENT_ID 중복 방지.
6. **검토 Gate:** 대표 ID 참조, 포함 Requirement 변경·폐기 감지, 기존 구성/산출물 유지, 변경 확인·판단·명시적 제거 또는 영향 없음 → 저장 → 현재 기준 재검증 → 재확정. 변경·검토·확정 요청 경쟁을 서버에서 검증한다.
7. **Requirement 상세 연결:** `RequirementIntakePage.tsx`의 relatedTab 내부 업무관계/Traceability와 별도 포함 그룹 조회 영역. 여러 그룹·상태·수 표시, 해당 그룹 선택 상태로 MDI/관리 화면 이동. 여기서는 구성 편집 없음.
8. **검증:** 제품 build/lint/frontend 관련 테스트/backend 관련 테스트/diff check 및 실제 브라우저 검수. 회사 LLM/승인 DB/fixture를 분리 보고. DESIGN 내부 문서/Prototype/검수 스크립트와 제품 UI·업무 기능 commit 분리.

## 화면이 필요한 정보 (계약 제안)

| 정보 | 의미 / UI 요구 |
|---|---|
| REQUIREMENT_GROUP_ID / PROJECT_ID | 그룹 식별/프로젝트 범위 |
| REQUIREMENT_GROUP_NAME / DESCRIPTION / GROUP_STATUS / MOD_DT | 기본정보·상태·수정일, 상태 자유 편집 금지 |
| 구성 REQUIREMENT_ID | 특정 버전 종속 관계가 아닌 대표 ID, 같은 그룹에 고유, 여러 그룹 포함 가능 |
| SOURCE_TYPE / SOURCE_ANALYSIS_ID | HUMAN은 null 근거, Analysis는 독립 실행 근거 참조 |
| INCLUSION_REASON | 사용자 판단, 원본 추천 사유와 분리 |
| Analysis 기준/실행시각/추천 항목/사유 | 실행마다 확인 가능, 추천 전체를 그룹으로 자동 복제하지 않음 |
| 검토 기준 / 변경 내용 / 검토 판단 / 확정 기준 | 현재 대표 ID를 보면서 변경 검토·동시 확정 방지, 영속 형식 SD 결정 |
| 목록/후보 총건수 / 실행 상태 / 오류 / 권한 / 동시성 값 | 실패와 0건 구분, 실제 서버 허용 값 반영 |

Prototype의 REVIEWED_MOD_DT 숫자, REVIEW_DECISION, MEMBERS, DISCARDED_YN 및 그룹 한글 상태는 메모리 예시다. 기존 요구사항 MOD_DT/API/업무 상태를 바꾸거나 그대로 신규 스키마에 복사하지 않는다. 도메인/DTO/Mock은 SCREAMING_SNAKE_CASE, UI 상태/handler는 camelCase를 따른다.

## 비동기/저장 acceptance

- 조회 실패에서 기존 초안과 basket을 유지한다. 특정 실행 실패가 다른 실행 선택을 지우지 않는다. 프로젝트/그룹/Analysis/요청 세대가 맞지 않는 늦은 응답은 적용하지 않는다.
- 최종 추가 전 선택 Requirement의 최신성/폐기/소속/권한을 확인한다. 서버 저장 시 다시 검증한다.
- 저장 성공 후 재조회한 결과만 완료로 표시한다. 저장 중 이탈/중복 Action 가드. 실패/409에서 초안을 보존하고 비교/다시 조회 경로를 제공한다.
- 확정은 현재 변경 검토 기준과 서버의 최신 Requirement 기준이 일치해야 한다. 검토 중 새 변경은 재검토로 남고 원래 선택/근거가 자동 삭제되지 않는다.
- 결과 불명은 상태 확인 뒤 재시도해야 한다. 요청 식별/멱등/부분 성공 여부는 SD 계약이 선행하며 DESIGN이 기존 CRUD로 이를 보장하지 않는다.
- 저장되지 않은 신규 그룹/Requirement와 영속 ID를 구분한다. Prototype의 임시 ID는 서버 발급처럼 제품에 노출하지 않는다.

## COMMON 확인 / DESIGN 후속

FormModal 넓은 업무 모달 옵션, 초기 focus/Tab trap/복귀, 기존 Grid overflow와 Workspace narrow 규격 지원 여부를 COMMON과 확인한다. 기존 구성 안에서 표현할 수 있으면 새 범용 컴포넌트/API를 만들지 않는다. 새 공통 구조/API가 필요하면 별도 요청한다. Prototype의 고정 수치로 제품을 우회하지 않는다.

SD 구현 후 DESIGN이 실제 UI의 JSX/CSS/renderer 표현을 직접 보정하고 브라우저 재검수한다. 그때 제품 UI commit만 dev-pm 선택 통합 대상이다. 이번 내부 산출물은 design-work 유지, dev-pm 반영 불필요. SD 기능 구현을 대체하지 않으며 담당 팀에 실제 메시지를 발송하지 않았다.

## 필수 검수 시나리오

| ID | 검수 |
|---|---|
| A01 | 빈 그룹에서 직접 추가 → 타 그룹 포함 허용, 현재 그룹 중복 비활성, 검색 밖 선택 유지 |
| A02 | Analysis-001에서 한 건, Analysis-003에서 한 건 → 두 출처 누적, 최신 실행 자동 대체 없음 |
| A03 | 같은 Requirement 다른 실행 선택 → 1건 유지, 기존/새 출처 직접 결정, 원본 사유 보존 |
| A04 | 추가 전 누적 확인/취소/Escape → 자동 그룹 반영·확정 없음 |
| A05 | 사람 포함 사유 편집 → 공백 오류 내부 표시, 원본 추천 사유/출처 유지 |
| A06 | 작성중 저장 → 검토 체크 후 확정 → 읽기 전용 → 명시적 재편집 |
| A07 | Requirement 변경 → 모든 포함 그룹 Gate 재오픈 → 구성/산출물 유지 → 영향 없음/구성 수정 → 재확정 |
| A08 | 폐기 → 표시 유지 → 명시적 제거, 다른 그룹/원본 보존, 정책대로 확정 제한 |
| A09 | Requirement 상세의 다중 포함 조회 → 대상 그룹으로 이동, 업무관계 영역 유지 |
| A10 | 미저장 이탈 → 계속 편집/저장 후 이동/버리기; 저장 실패·충돌은 이동 금지 |
| A11 | Empty/Error/Loading/늦은 응답/권한/근거 접근불가/동시 확정 → 상태 오인/초안 유실 없음 |
| A12 | 1440/1024/768/375px, 낮은 높이, 200% 확대, 키보드 단독/스크린리더 명칭 → footer/Action 접근, 내부 스크롤 |
