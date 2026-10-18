# 프로젝트 전체 요구사항 AI 그룹핑

2026-10-18, sd / sd-work. 사용자 UX·데이터 보존 계약에 따라 구현.

## 사용 흐름

요구사항 관리 → ✨ AI 그룹핑 → 분석 실행 → 그룹 검토·편집 → 초안 저장 → 검토 승인 및 등록 대상 선택 → 선택 그룹 등록. 기존 목록/상세는 마운트를 유지하고 가시성만 전환하여 선택·입력·분할 너비를 보존한다. 목록이 기본이며 2열 반응형 카드와 같은 편집 데이터를 공유한다.

그룹명·추천 이유, 요구사항 추가/제외/이동, N:M 중복 포함, 그룹 합치기, 선택 요구사항 분리, 미분류 배치, 승인/보류를 제공한다. 내용/구성 수정은 검토 승인을 해제하고 등록 선택에서도 제외한다. 승인 상태도 서버 초안에 저장하며 자동 등록/최종 확정하지 않는다.

## API·저장 계약

`/api/standard-design/projects/{project}/grouping`의 GET=이력, POST=실행. `/{id}`의 GET=상세/입력 snapshot/편집 초안/등록 연결, PUT=VERSION 검증 저장. `/{id}/register`는 승인 그룹 ID 목록을 받아 기존 RequirementGroupService로 DRAFT를 생성한다. 기존 GROUP_DESIGN/GROUP_RECOMMENDATION·그룹 상태 전이는 변경하지 않았다.

추가 Flyway V19:

- BSDPGANL: PROJECT_GROUPING 실행, 요청 식별자, 불변 입력 snapshot, 실행 상태/기한, 별도 편집 DRAFT_JSON 및 VERSION.
- BSDPGRAW: 분할 호출별 정확한 HTTP 응답 원문·모델·HTTP 상태. INSERT만 사용하며 파싱 실패도 보존.
- BSDPGLNK: 분석·초안 그룹·생성 그룹의 연결과 사용자 검토 당시 구성/사유 EVIDENCE_JSON. 같은 분석/그룹 연결은 유일하다.

같은 REQUEST_ID 실행은 재사용한다. 등록은 분석 행 잠금과 고유 연결, 기존 그룹 생성 멱등키로 중복을 방지한다. 전체 등록은 트랜잭션으로 처리한다. 입력에 없는 ID·중복 구성·커버리지 누락·다른 프로젝트 접근·VERSION 충돌을 거절한다. 분석 이후 변경/폐기된 요구사항은 등록 전에 차단한다. 등록된 초안 그룹은 워크스페이스에서 변경할 수 없고 기존 그룹관리에서 편집한다.

회사 DesignLlmClient/CompanyLlmClient를 그대로 사용한다. 최대 24건/18,000자 입력 묶음으로 호출하고 같은 제목 그룹은 집계한다. 다른 제목의 의미적 병합은 사람이 판단한다. 단일 요구사항이 입력 한도를 초과하면 원문을 자르지 않고 미분류로 보존한다. 허위 ID는 제거하고 빠진 모든 입력 ID는 미분류로 복구한다. 호출별 60초, future 대기 65초, 실행 전체 10분의 기한을 적용한다. 브라우저 요청은 20초 제한·이력 재조회로 복구한다. 서버 재시작으로 끝내지 못한 실행도 기한 후 실패로 표시하며 새 요청으로 재시도한다.

## 실제 검증

- SD PostgreSQL 17.11, localhost:5432/basekit. V19 정상 적용, clean/repair/기존 migration 수정 없음.
- 실제 회사 LLM: PG-3b89f281a967451a9e8929f4fa33035c, 저장된 유효 요구사항 22건 → 그룹 6개 / 미분류 0건. 초안만 보존, 자동 승인/등록 없음.
- 실제 PostgreSQL opt-in 통합 테스트: 승인 그룹 DRAFT 생성, 구성 수, 근거 연결, 반복 등록 방지 및 그룹관리 조회 통과. 테스트 트랜잭션 롤백 후 기존 요구사항 22건·그룹 1건의 API snapshot 전체 동일, 등록 연결 0건 확인.
- H2 자동 회귀와 PostgreSQL 검증은 별도 수행했다. 최종 전체 backend 81건 중 75통과/조건 6skip, 실패 0. PostgreSQL opt-in 테스트는 별도 실행에서 1건 통과했다. 일반 실행의 skip 6건에는 이 opt-in 1건이 포함된다.
- frontend 102건 통과, build/lint/diff check 통과. 기존 xlsx dynamic import 및 bundle 크기 경고 유지.
- 실제 Edge: http://localhost:5176/baseKit/#/standard-design/requirements → ✨ AI 그룹핑. 문서형 목록·2열 카드·KPI 22/6/0, 편집 제목의 보기 전환 공유, 재진입 이력, 목록 복귀 선택 요구사항·분할 너비 55→55 보존 확인. 화면 PNG는 별도 작업 산출물에 보관.

## 실행 및 한계

현재 공통 WindowAccessPolicy는 sd 단독 프로필을 개발환경으로 인식하지 않는다. 인증/SSO 코드를 수정하지 않고 기존 dev 프로필과 sd 포트 프로필을 조합하여 실제 8083을 실행했다:

`node scripts/run-backend-maven.mjs spring-boot:run '-Dspring-boot.run.profiles=dev,sd'`

PostgreSQL 기본 연결을 그대로 사용하며 local/H2 프로필은 사용하지 않는다. 회사 LLM/DB 비밀값은 사용자 환경변수에서 주입하고 파일/로그에 기록하지 않는다. 운영 Host 권한 매핑은 기존 정책에 따라 별도 설정이 필요하다.

기능상 합치기/나누기를 포함해 요청한 검토·등록 흐름을 구현했다. 대규모 실데이터 부하, 실제 운영 Host 권한, 좁은 화면 브라우저 검수는 미검증이다. 이전 ChatGPT 화면은 본문 대신 참조 표식만 조회되어 픽셀 단위 일치 여부를 검증할 수 없으며, 이번 사용자 UX 계약과 실제 렌더를 기준으로 검수했다.
