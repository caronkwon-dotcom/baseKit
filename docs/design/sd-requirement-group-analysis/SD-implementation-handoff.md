# SD 구현팀 인계 — 요구사항 그룹 분석 TAB

2026-10-07 · DESIGN 완료 범위는 Prototype/UX 제안 · 제품 기능 구현 없음

## 기준

origin/dev-pm `a2c60889036a0275dfdef3a62b7a6df6393c1c64`, 작업지시 `618e94ce5d05a6a7fd506916025f9b7989f249e3`. 제품 기준은 항상 다음 개발 시작 시 최신 dev-pm이다. DESIGN branch 전체를 merge하지 않는다. 관련 파일: 본 폴더 UX/state/flows/open-decisions/verification와 `../sd-requirement-group/Prototype.html` 및 본 폴더 `Prototype.css`, `Prototype.js`.

## 현행과 재사용 경계

dev-pm의 RequirementGroupPage는 실제 그룹 관리 V1이며 MasterDetailMultiGrid/Grid/FormField/FormModal/ActionButton/프로젝트 Context를 사용한다. RequirementRevision·VERSION·미저장 보호·복수 추천 근거·폐기 항목 유지 계약을 보존한다. 기존 그룹 Prototype의 MOD_DT 숫자·단일 추천 근거·폐기 제거 필수는 제품 모델로 복제하지 않는다.

RequirementAnalysisPanel/기존 analysisApi는 Program 후보 편집/확정/생성·RESULT_VERSION 중심이다. 이번 그룹 분석의 ‘독립 실행 보존’과 의미가 달라 그대로 연결하지 않는다. 기본정보의 추천 근거 조회(BSDRANLS/BSDRARIT)도 그룹 설계 분석과 다른 책임이다. 재사용할 것은 결과 표현/검증 아이디어이며 기존 API를 신규 계약으로 간주하지 않는다. UI 내부 상태는 camelCase, 업무 계약은 SCREAMING_SNAKE_CASE를 따른다.

## 구현 순서

1. A01~A05: 독립 실행/불변 Snapshot/입력 최신성·멱등성/검토 표시/권한·동시 실행 정책 확정. DB/API 명칭과 migration은 SD 소유이며 이번 문서에서 등록하지 않았다.
2. A07/A08: 현행 우 Detail 구조의 BaseTabs 수용을 COMMON과 확인한다. 기본정보 영역은 기존 기능을 그대로 이동한다. 그룹 편집 코드를 분석 TAB에 복제하지 않는다.
3. Context 상태는 PROJECT_ID+GROUP_ID를 키로 관리하고 결과 선택은 ANALYSIS_ID에 결합한다. 다른 Context의 늦은 응답을 폐기한다. 기본정보 초안이 있으면 조회 허용/실행 차단, 기존 그룹 이동 보호 유지.
4. 실행 전 FormModal에 읽기 전용 Snapshot을 표시하고 submit 시 서버 최신 상태를 확인한다. 취소는 실행 없음. 접수 실패/유실과 실행 FAILED를 구분한다. 요청/중복 submit 잠금과 재진입 복구를 서버 계약으로 보장한다.
5. 이력 Grid+상태+과거 입력 배너+5개 결과 BaseTabs를 연결한다. 새 결과는 독립 행이며 기존 결과/검토 표시를 자동 초기화하지 않는다. 완료 결과 검토는 명시적 저장으로만 REVIEWED 전환한다.
6. 비교는 동일 그룹 결과 2건, 공통 영역 TAB, 각각 Snapshot/근거, 입력 차이 안내, 넓으면 2열·좁으면 1열이다. 국소 조회 실패 재시도와 이전 선택 복귀를 구현한다. 자동 Diff는 V1 제외.
7. Empty/Loading/Error·재시도/접수 유실·늦은 응답·미저장 보호·긴 내용·키보드/overflow를 제품 브라우저에서 재검증한다. 실 API/DB/LLM 검수와 fixture 검수를 구분한다.

## 필수 수용 기준

- DRAFT/REVIEW_REQUIRED/미저장 입력/미확인 접수에서 새 실행이 서버에서도 거절되어야 한다.
- 확인 이후 변경된 입력은 실행하지 않으며 사용자가 확인한 입력을 조용히 최신화하지 않는다.
- 새 실행/실패 재시도가 이전 실행 결과를 덮어쓰지 않는다. 결과 재조회는 새 실행을 만들지 않는다.
- 그룹 변경은 과거 Snapshot/결과/검토 상태를 훼손하지 않는다. REVIEWED는 최종 설계 확정이 아니다.
- 분석 TAB에는 그룹명/설명/구성 편집·Requirement 추가·제거가 없어야 한다.
- 5영역마다 출처/근거와 영역 없음 상태를 확인할 수 있어야 한다.
- 비교는 동일 그룹의 완료 결과만 포함하고 입력이 다른 경우 안내한다. 한쪽 실패는 다른 결과를 보존한다.
- 원문 HTML/코드를 실행하지 않고 사용자용 오류를 표시하며 민감한 응답/비밀정보를 노출하지 않는다.

## 제외 범위와 통합

실제 API/DB/LLM 호출, Program/메뉴/Role/Action/프로세스/코드 생성, 자동 확정·채택·병합·최적 결과 선정, 복잡한 Diff 엔진은 이번 DESIGN에 없다. 후보 편집/최종 설계 저장도 제공하지 않는다. 제품 UI 코드는 이번에 변경하지 않았다. 내부 Prototype와 설계/검증은 서로 별도 commit으로 design-work에 보존한다. dev-pm에 반영할 제품 commit은 없고 branch 전체 merge/PR은 요청하지 않는다. 후속 SD 구현은 제품 코드 commit만 선택 통합하고 최신 dev-pm에서 검수한다.

## 검수 인계

분석 Prototype와 기존 그룹 회귀 자동 검증 결과/캡처는 verification을 따른다. 서버 경합/멱등성·실제 회사 LLM·PostgreSQL·Runtime 권한·실제 그룹 분석 기능은 검증되지 않았다. 공통 BaseTabs 방향키/FormModal focus와 우 Detail 연결점은 실제 제품에서 확인할 항목이다. Prototype의 native dialog 통과를 FormModal 통과로 보고하지 않는다.
