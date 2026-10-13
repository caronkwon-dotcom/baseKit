# SD 그룹 분석 흐름 및 추천 조회 수정 (2026-10-13)

## 원인

분석 실행은 CONFIRMED 및 확정 Snapshot을 전제로 했다. 그룹 개요 실행은 BSDRGANL에 HTTP 원문과 요청 Snapshot으로 저장되지만 추가 모달은 BSDRANLS/BSDRARIT만 조회했다. LLM 그룹 분석에는 독립 추천 행을 생성하는 producer가 없으므로 기존 추천 모달은 빈 목록을 표시했다.

## 반영 정책

DRAFT → 저장된 그룹 분석 → 검토/수정/저장/새 분석 반복 → 사용자 최종 CONFIRMED. REVIEW_REQUIRED에서도 분석 가능하다. 확정 상태 구성 편집은 기존 명시적 구성 수정 전환을 유지한다. 분석은 자동 편집/확정을 하지 않는다. 원본 변경은 DRAFT를 유지하며 VERSION을 증가시키고, 확정·재검토 그룹은 REVIEW_REQUIRED로 전환한다.

실행 시 최신 VERSION을 검증하고 Requirement/그룹 잠금 안에서 현재 원본 Snapshot을 보존한다. 같은 저장 버전은 불변 Snapshot을 재사용하고 새 REQUEST_ID마다 독립 실행이 생성된다. 확정 Context는 별도 최종 버전으로 보존한다. 기존 확정 Snapshot/실행/HTTP 원문은 변경하지 않는다.

기본정보/분석 탭을 오가도 편집 초안은 유지된다. 미저장 초안은 기본정보 저장 후 분석하며 저장된 빈 그룹은 분석할 수 없다.

## 조회와 근거 저장

읽기 전용 /api/standard-design/requirement-analysis-sources 목록/단건 API는 동일 프로젝트의 독립 추천 및 그룹 개요 실행을 projection으로 제공한다. 기존 recommendation 저장 API/테이블은 유지한다. 실행이 있지만 후보가 없으면 실행 상태/근거 없음 메시지를 표시한다.

V0 businessAreas/processCandidates/programCandidates 및 이전 V0 후보의 evidenceRequirementIds를 입력 Snapshot 내 존재하는 동일 프로젝트 Requirement에만 매핑한다. 원본 name/title 및 description/purpose를 수정 없이 이어서 사유로 표시한다. V0는 외부 Requirement 추천 기능이 아니므로 현재 입력의 근거를 재사용하는 기능이다. 다른 그룹의 동일 프로젝트 실행도 선택하여 구성에 사용할 수 있다. 실행/검색 전환 시 basket은 유지하며 사용자 최종 선택만 초안에 반영한다.

V16은 BSDRGREV를 추가하여 그룹 개요 출처를 기존 독립 추천 근거(BSDRGEVD)와 별도 FK로 보존한다. 두 저장 모델을 합치거나 결과를 복제하지 않는다. 저장 시 실제 성공 결과의 입력 근거와 프로젝트를 다시 검증한다.

## 검증

- Frontend build/lint 및 56건 회귀 통과. 기존 대형 bundle 경고 유지.
- Backend 전체 62건 중 57통과, 외부 PostgreSQL 조건 5 skip. H2에서 V1~V16 migration 검증.
- 통합 테스트: DRAFT 실행, 기본정보 및 구성 변경 후 독립 재분석/이력/Snapshot 보존, 확정, 원본 폐기 후 REVIEW_REQUIRED 분석 및 현재 폐기 원문 확인, 잘못된 근거 ID 제외, 다른 프로젝트 결과 제외, source 근거 저장.
- 브라우저: 임시 H2 memory + 로컬 HTTP 모의 LLM, 5186/8093. DRAFT 실행/새 실행 이력, 탭 전환과 편집 초안 유지, 미저장 실행 차단, 독립 추천 및 그룹 분석 실행/원본 사유 조회, 실행 전환 시 누적 선택, 1 Requirement의 2근거 합산 저장, 최종 확정과 readonly, 저장된 두 출처 재조회. console error 0.
- 실제 회사 LLM 및 운영 PostgreSQL migration/실데이터는 미검증. 기본 인증 Host 권한 연결도 별도 통합 검수 대상.
- V0는 입력 내 근거를 재사용한다. 입력 밖 Requirement를 새로 추천하는 LLM 기능은 이번 범위에 없다. 조회 projection은 저장된 실행 원문을 파싱하므로 실행 수가 커지면 조회 최적화가 필요하다.
- 기준 origin/dev-pm은 이미 sd-work에 포함되어 있어 추가 기준 통합 없음. 신규 branch/worktree 및 dev-pm 직접 변경 없음.
