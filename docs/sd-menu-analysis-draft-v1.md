# SD 실제 그룹 분석 → 메뉴 초안 V1

2026-10-18. 독립 경로 `/baseKit/#/standard-design/prototypes/menu-builder`를 유지하고 그룹 분석 화면에 프로젝트를 전달하는 새 창 링크를 추가했다.

## 데이터 계약과 변환

- 프로젝트 목록 GET `/api/standard-design/projects`의 PROJECT_ID를 선택한다. 실제 목록이 ID만 제공하는 경우 ID를 표시한다. 샘플 프로젝트를 실제 목록에 합치지 않는다.
- 기존 requirement-groups 목록/상세의 PROJECT_ID, REQUIREMENT_GROUP_ID, VERSION, GROUP_STATUS, MEMBERS[].REQUIREMENT_ID를 사용한다.
- 새 GET `requirement-groups/{group}/analyses/menu-draft`는 기존 이력 목록과 동일 projection을 SELECT만 수행한다. 기존 `/analyses` 목록의 expireRunning 부작용은 이 경로에서 실행하지 않는다. 상세는 기존 `analyses/{id}` GET을 사용한다.
- 그룹별 최신 GROUP_DESIGN 실행을 CREATED_AT/ANALYSIS_ID 내림차순으로 선택한다. 최신 실행이 실패/실행 중이면 과거 성공 결과로 대체하지 않고 안내한다.
- 기존 adaptGroupAnalysis 계약의 programCandidates/screenCandidates, name/title, description/purpose, evidenceRequirementIds를 사용한다. 서버 상세 RESPONSE와 기존 Adapter의 원문 복구 규칙을 재사용한다.
- 이름·근거 형식이 잘못되거나 근거가 없거나, 현재 프로젝트/그룹의 유효한 요구사항이 아닌 ID가 하나라도 있으면 후보를 제외한다. 동일 후보 내 중복 근거는 합친다. 이름이 같은 서로 다른 후보를 임의 병합하지 않는다.
- 유효 후보가 있는 그룹만 폴더로 만들고 후보를 2Depth 화면으로 배치한다. 이는 고정 변환 규칙이며 AI가 새 메뉴 계층을 생성한 것이 아니다. 최대 3Depth 편집은 기존 트리 로직을 사용한다.
- 이전 분석 버전/REVIEW_REQUIRED는 재분석 경고와 함께 참고 초안을 허용한다. 후보 상세에 분석 ID/버전, 현재 그룹 버전/상태, 원본 후보 배열·인덱스, 그룹 ID, 요구사항 ID·이름을 표시한다. 과거 근거를 현재 분석으로 표시하지 않는다.
- requirements의 PROJECT_MENU_IDS는 project-menus.ITEMS의 PROJECT_MENU_ID로 이름을 조회하고, MENU_KEYS와 함께 참고 관계로만 표시한다. 관계를 새 후보에 자동 확정하거나 원본 테이블을 변경하지 않는다.

## 편집과 저장 경계

실제 초안 저장 키는 `sd-menu-analysis-draft-v1:{encodeURIComponent(PROJECT_ID)}`이며 샘플 키 `sd-menu-builder-prototype-v1`와 분리한다. 실제 초기 화면에 샘플을 자동 표시하지 않는다. 저장은 명시적 브라우저 저장만 지원한다. 새로고침 후 프로젝트 선택 → 저장 초안 열기로 복원한다. 출처는 저장 당시 스냅샷이며 서버 갱신은 다시 만들기로 확인한다.

프로젝트 전환/재생성/다른 초안 열기는 편집 유지·계속 진행 확인을 제공한다. 읽기 중 편집기를 비활성화하며 조회 오류에서는 기존 편집기를 유지한다. 새 결과는 기존 브라우저 저장본을 자동 덮어쓰지 않는다. 초기화는 해당 화면을 열었을 때의 초안으로 돌아가며 Undo 가능하다. 저장 가능한 노드는 최대 2000개다.

서버 draft 저장, 실제 메뉴 확정/등록, 요구사항 매핑 변경, 새 LLM 실행은 미구현이다. 기존 LLM 그룹 설계가 이미 후보·근거를 제공하므로 V1에서는 별도 분석 작업을 추가하지 않았다. 후보 간 계층 의미를 생성하려면 후속 설계/실행 계약이 필요하다. DB migration, COMMON/SSO, Revision 정책은 변경하지 않았다.

## 검증

- frontend 112/112, build/lint/diff check 통과. 기존 xlsx import/대형 chunk 경고 유지.
- backend 96건 중 84통과·외부 조건 12skip. 새 통합 테스트에서 기한이 지난 RUNNING 행을 초안 GET으로 조회해 전체 행 불변 확인.
- 실제 PostgreSQL localhost:5432/basekit를 세션 default_transaction_read_only=on과 Hikari read-only로 연결한 전용 8106에서 검증했다. Flyway는 비활성화하고 제품 Repository 밖의 임시 런처로 ApplicationReadyEvent를 억제해 기존 시작 시 복구/Endpoint 수집 쓰기를 방지했다. 제품 코드에 이 런처는 포함하지 않는다. 기존 서버는 보존했다.
- 실제 Edge 5193에서 SDP-001 → 반품프로세스의 GA-cdd0ab6b40e849d99326bdbdfb1e5f7d(v13, 현재 그룹 v15/REVIEW_REQUIRED)로 폴더1+후보1 생성, 실제 근거 REQ-0391B232-20E 표시, 이름 편집/Undo/Redo/보조 이동/DnD 2→1Depth/브라우저 저장·복원/갱신 취소 편집 유지 확인. SDP-002 저장본 없음·그룹 없음 안내 확인.
- 실제 SD 30개 테이블의 브라우저 검증 전후 건수 및 정렬된 전체 행 해시 동일. 실제 요구사항·그룹·분석 이력·메뉴 관계 쓰기 없음.
- 수백 후보의 실제 브라우저 부하와 보조기기 낭독, 새 LLM 계층 생성, 서버 저장/확정은 미완료다. 원본 backend/data는 별도 백업 및 미추적 상태로 보존했다.

일반 실행은 최신 백엔드와 SD 프런트가 필요하다. 이번 검수용 URL은 `http://127.0.0.1:5193/baseKit/#/standard-design/prototypes/menu-builder?project=SDP-001`이며 전용 백엔드는 읽기만 허용한다.
