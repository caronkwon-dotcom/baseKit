# ADR 044: 요구사항 추적 조회와 재검토 표시

- 일자: 2026-11-08
- 상태: PLAN 승인 전 구현, 사후 검토 대기(PM이 채택하면 승인 표기로 갱신). Step A 구현·Step B 백엔드 구현·로컬 검증 완료. Step B 화면은 PM 목업 확인 후 구현.
- 관련: [ADR 042](042-sd-screen-design-document-and-function-specs.md)

## 결정
1. **DB 변경 없음.** 추적 상태와 재검토 표시는 모두 읽을 때 계산하며 새 테이블·컬럼·migration이 없다. 화면 설계 JSON의 `FUNCTION_SPECS[].REQUIREMENT_IDS`는 서버가 파싱해 집계한다(테이블화하지 않음).
2. **API(읽기 전용)**: `GET /api/standard-design/requirements/{id}/trace?PROJECT_ID=`, `GET /api/standard-design/requirements/trace-summary?PROJECT_ID=`. 프로젝트 ID가 없으면 422, 다른 프로젝트의 요구사항이면 404. 사용자별 접근 제어는 이 시스템에 아직 없어 "권한"은 프로젝트 소속 검증이다. 요약은 요구사항 N건을 조회 5번으로 계산한다(1,000건 H2 기준 약 0.2초).
3. **추적 상태**(강한 순서): `DESIGN_REFLECTED`(설계 반영) = 프로그램 근거(`BSDGPREQ`)에 있고 그 프로그램의 화면 설계가 **확정**이며 기능 요건 `REQUIREMENT_IDS`에 포함 / `PROGRAM` = 프로그램 근거에 있음(설계 없음·초안·확정이지만 미포함) / `GROUP_ONLY` = 그룹 구성(`BSDRGRQ`)에만 있음(그룹 상태 무관) / `UNLINKED`. 설계서 발행 이력이 생기면 "설계 반영"을 다시 정의한다.
4. **재검토 필요 표시**: 요구사항 이력(`BSDRRHIS`)에 프로그램 근거 스냅샷 리비전보다 큰 리비전이 있고 그 `EVENT_TYPE`이 `ATTACHMENT_ADDED`·`ATTACHMENT_REMOVED`가 아닌 것이 하나라도 있으면(본문 필드 변경: `UPDATED`·`CHANGE_CONFIRMED` 등) 프로그램에 표시한다(`ProgramReviewStatus`, 프로그램 목록 응답의 `REVIEW_REQUIRED_YN`, `STALE_REQUIREMENT_IDS`). 스냅샷 리비전이 없거나 스냅샷 이후 이력이 없는 예전 데이터는 판단하지 않는다. 화면 설계는 연결된 프로그램이 재검토 필요일 때 같이 표시한다(`GET …/screen-designs`의 `REVIEW_REQUIRED_YN`). 설계 저장 시점의 요구사항 리비전은 저장하지 않으므로 정확한 비교는 아니다. **표시만 하고 상태를 자동으로 바꾸지 않는다.** 첨부 추가·삭제는 리비전을 올리지만(`RequirementService`) 첨부만 바뀐 경우는 재검토로 표시하지 않는다(PM 승인 2026-11-08). 알려진 한계: 이력 없이 만들어진 옛 첨부 리비전 뒤에 변경이 생기면 그 기준 기록(`BASELINE`)이 본문 변경으로 집계될 수 있다.
5. **Step A**: 프로젝트 선택 팝업(`.sd-project-selector-modal`)만 폭 760px, 검색 칸 3개, 버튼 아래 배치로 바꿨다(1280/1440/1920에서 재현 후 확인, 상태 콤보가 58px 가려지던 문제). 연관정보 탭 안내 문구를 실제 동작("포함된 요구사항 그룹만 조회")으로 정정했다.

## 아직 하지 않은 것
Step B 화면(연관정보 탭 실데이터, 목록 추적 상태 컬럼·필터, 재검토 배지), 관련 메뉴 탭 숨김, 설계서 발행 이력·RTM·프로젝트 커버리지, 기능↔요구사항 테이블화.
사용자 관리 도입 시 trace API(`trace`, `trace-summary`)에 ROLE × PROGRAM × ACTION_CODE 검사 추가(현재는 프로젝트 소속 검증만).

## 공통 요청 후보
`SearchPanel`이 폭에 따라 칸 수를 줄이지 않아 폭이 고정된 팝업에서 겹치는 문제, `FormModal` 폭 지정 수단.
