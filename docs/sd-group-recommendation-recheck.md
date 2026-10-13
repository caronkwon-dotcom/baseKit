# SD 그룹 보완 Analysis 재검증 — 2026-10-13

## 기준과 변경
- 기존 G:\CARON\basekit\sd / sd-work 사용. 신규 branch/worktree 없음.
- origin fetch 완료. origin/dev-pm 76e9213a8b3ddde3c509189f85474845c0072b78은 HEAD의 조상이며 기준 변경 추가 없음. dev-pm 직접 수정/merge 없음.
- 오류 원인: HTTP 등 제한 환경에서는 crypto가 있어도 randomUUID 함수가 없을 수 있는데 그룹 분석 실행/신규 그룹/파일 큐에서 직접 호출했다.
- 공통 frontend/src/utils/uuid.ts의 createUuid로 통합. randomUUID → getRandomValues → Math.random 기반 UUID v4 형식 fallback. 함수 지원 여부 확인과 제한 환경의 호출 예외를 처리한다.
- 수정: RequirementGroupAnalysis.tsx, RequirementGroupPage.tsx, RequirementAnalysisPanel.tsx, BaseFileUpload.tsx. 화면별 fallback 제거.
- ANALYSIS_ID/REQUIREMENT_GROUP_ID 등 업무 ID는 기존 서버 생성 유지. REQUEST_ID는 요청 중복 방지와 재시도 복구를 위한 클라이언트 토큰이며, 서버 생성으로 바꾸면 기존 재시도 계약을 변경하므로 공통 유틸 사용을 유지했다. 최종 fallback은 인증/보안 토큰용이 아니다.
- DB/API 및 UI 명칭 변경 없음. 기존 V17까지 격리 H2에 적용 성공.

## 이번 실행 증거
- 별도 프론트 5187 / 백엔드 8104 / 모의 LLM HTTP 18094 / H2 memory. 기존 SD 서버 보존.
- 실제 브라우저에서 분석 실행 버튼 → backend → DesignLlmClient → HTTP 모의 LLM 호출 성공. 실제 회사 LLM 호출은 수행하지 않았다.
- 프로젝트 SDP-001: 요구사항 6건, DRAFT 그룹 3건 / 미포함 후보 3건.
- 보완 실행 1: GA-89928c19f223484fa0a64ccdfc09d711, 3건 Snapshot / 후보 3건 / 추천 2건.
- 보완 실행 2: GA-68fcf66576db42beb425a9040f3a5168, 동일 그룹 독립 이력. 모달에서 실행1·2 간 선택 유지, 각각 1건을 선택했다.
- 추천 예: 승인 후 발주, 입고 확인. 원문 사유: “승인 이후 후속 처리와 연결되므로 함께 검토가 필요합니다.” requirementId/reason 조회 확인.
- 기본정보 모달 → 최종 확인 → 초안에 추가 → 저장: 3→5건. 선택 2건만 추가, 각 SOURCE_ANALYSIS_IDS 1건 유지.
- 보완 재분석: GA-952a41ef595f47899aac4db664373711, 새 v2 / 5건 Snapshot / 미포함 후보 1건 / 추천 1건(발주 알림). 기존 2개 실행의 3건 Snapshot/추천/RAW 보존.
- 설계 회귀: GA-dd45ad4cf21b43cf8e593c14dd328f42, GROUP_DESIGN 성공 / group-overview-v0.3 / summary 결과 조회. 보완 3회와 타입별 구분. 추천 모달은 보완 3회만 노출.
- 이미 추가한 기존 추천 2건의 체크박스 disabled 확인. 서버 통합 테스트에서도 중복 저장 차단·기존 멤버/미존재 ID/폐기 ID/중복 추천 제거 검증 통과.
- API 재조회로 5건/DRAFT/독립 4개 이력/원문/원본 Snapshot/2건 근거 연결 확인. 서버 저장 후 API 조회이므로 브라우저 임시 상태만 확인한 결과가 아니다.

## 검증
- frontend build/lint 통과. 기존 테스트 56건 + UUID 환경 테스트 5건 통과.
- UUID 테스트: native, randomUUID 없는 getRandomValues 지원 환경, crypto 없는 환경, 두 함수 호출 차단 환경, non-callable randomUUID.
- backend: 64건 중 59 통과 / 5 외부 DB 조건 skip / 실패 0.
- 브라우저: 보완 실행·조회·모달·누적 선택·저장·재분석·설계 회귀·중복 차단 완료. 콘솔 error 0. 이번 브라우저는 현대 브라우저이며 실제 사내 구형 브라우저는 테스트 환경 시뮬레이션으로 보완했다.
- git diff --check 통과. build의 기존 큰 bundle 경고는 유지.

## 한계와 다음 사용자 검수
- 실제 회사 LLM 및 운영 PostgreSQL V17 적용은 미검증. 이번 모의 LLM 성공을 운영 실행 성공으로 간주하지 않는다.
- 격리 검수 데이터는 운영 화면의 실행 이력에 나타나지 않는다. 실제 SD 화면에서는 수정된 프론트를 새로 로드하고, DRAFT 그룹 → 분석 탭 → 그룹 보완 Analysis → 분석 실행 → 기본정보 → Analysis에서 추가 순서로 검수한다.
- HTTP 제한 브라우저의 UUID 문제는 공통 fallback으로 수정했으나 기존 React/Vite의 전체 구형 브라우저 지원 범위를 확장하지는 않았다.
- 대량 후보 입력 크기 한계는 기존과 동일하다. 추가 확장 없이 보고 후 대기.