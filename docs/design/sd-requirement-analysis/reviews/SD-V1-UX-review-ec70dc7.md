# SD V1 실제 제품 UX 검수

2026-10-05 역할 정정: [DESIGN 역할](../../DESIGN-role.md)을 적용한다. 아래는 ec70dc7 검수 시점의 증거이며 결함 해결을 뜻하지 않는다. R01 등의 기존 구조 안 UI 보정은 DESIGN이 직접 적용하고, 업무 데이터·출처 매핑은 SD, 새로운 공통 구조/API는 COMMON과 협의한다. 이번 프로그램관리 수정으로 SD 기능 BLOCK을 해제하지 않는다.

검수일: 2026-10-05 · DESIGN 최종 판정: **BLOCK / 수정 후 재검수 필요**

- SD 대상: sd-work / `ec70dc7811b21da4fa0ba82a51d15f3a076a2b5d`
- DESIGN 승인 기준: `99bd96dfd2441184344045ed63186fdde6eeac3d`
- 작업지시: `279dec0c0ec4742137a8ba6723d436d707b53691`의 DESIGN-team-task.md
- 검수 기준: 승인 SHA의 UX-review.md (UX01~UX17)

## 검수 환경과 증거 범위

지정 SHA와 일치하는 G:/CARON/basekit/sd의 제품 Frontend를 Vite에서 실행했다. Chrome headless(1440×1000, 320×800), Playwright로 제품 화면의 checkbox·tab·textarea·modal·button을 실제 조작했다. API 요청은 브라우저에서 모두 차단/대체하고 정상·실패·STALE·생성 불명 응답 fixture를 제공했다. 승인 프로토타입 HTML을 시험한 것이 아니라 실제 제품 React/CSS를 시험했다.

이 결과는 **제품 화면 + API fixture** 검수다. 실제 회사 LLM, 실제 분석/생성 Backend와의 브라우저 통합, 승인 PostgreSQL, 생성 후 DB 재조회 검증은 미수행이다. 사용자 보고의 자동 테스트 통과를 별도 재실행하거나 실제 연동 통과로 취급하지 않았다. 외부 DB·LLM 요청 없음. 제품 소스 수정 없음.

검증 기록: sd-v1-browser-results.json. 재현 스크립트: sd-v1-product-review.cjs. Desktop/320px/입력 확인 실패 캡처를 확보했고 화면을 육안 확인했다. 최종 실행의 페이지 JavaScript 오류 0건. 브라우저 상태 응답은 fixture이므로 서버 권한·실제 멱등성의 근거가 아니다.

## BLOCK

| ID | UX 기준 | 확인된 문제·증거 | 필수 수정/승인 조건 |
|---|---|---|---|
| B01 | UX09/UX11 | 확정 상태에서 전체 의견 변경 직후 생성·후보 선택이 활성 상태. 입력 확인 API 실패(503) 후에도 STALE 표시 없이 생성 버튼 활성 유지. 요구사항 두 건을 모두 해제하면 /input 요청 0건, 후보 선택 활성 유지. 소스 RequirementAnalysisPanel.tsx:85~90은 선택 0건에서 검사를 건너뛰며 500ms 서버 응답 이후에만 STALE 반영; :151은 서버 status만 사용. | 현재 입력 signature와 결과 입력 baseline이 다르면 즉시 로컬 STALE/확정 무효 처리. 선택 0건도 변화로 감지. 서버 확인 중/실패 시 후보 선택·편집·확정·생성과 열린 생성 모달 제출까지 차단. PARTIAL/실패/불명 결과 등 재시도 상태의 입력 변경도 함께 재검증. API handler에서도 입력 버전과 현재 확정 snapshot 검증. |
| B02 | UX13 | GENERATION_UNKNOWN 응답에서 ‘생성 상태 조회’와 ‘SD Program 생성’이 동시에 활성. RequirementAnalysisPanel.tsx:157에 UNKNOWN이 canGenerate에 포함, :245~246에서 조회 이전 생성 확인 진입 허용. 재진입 시 pendingGenerationRequest ref도 영속 복원되지 않음. | 불명 상태에서는 조회를 다음 필수 행동으로 두고 생성/새 생성 요청을 차단. 서버가 확인한 실패 항목에만 기존 생성 요청 기준 재시도. 실제 중복 생성이 발생했다고 단정하지 않으며, 현재 검수는 조회 우선 계약 위반을 재현한 것임. |
| B03 | UX06/UX12/UX13 및 승인 판정 | 실제 회사 LLM·승인 DB·제품 브라우저 전체 흐름의 실행 증거 없음. 사용자도 미수행이라고 명시. | 승인 환경에서 실제 LLM 요청→검토→확정→생성→재조회, 응답 유실·부분 실패·재진입·중복 방지의 증거 확보 후 승인 판단. fixture/자동 테스트로 대체하지 않음. |
| B04 | UX14 | 320px viewport에서 document.scrollWidth=1280. 공통 styles.css:75,81의 body/#root min-width:1280px. 분석 패널의 주요 영역이 화면 밖에 있고 320px 적응 검수 기준을 충족하지 못함. | COMMON과 shell 최소 폭 정책·접근 경로를 조정하고 SD 좁은 화면 LIST/DETAIL 전환/주요 행동 접근을 재검수. 공통 기존 제약이므로 SD 전용 CSS만으로 임시 덮어쓰기하지 않음. |

B01의 서버 근거: AnalysisService.confirm/generate는 기존 결과 버전·상태와 저장된 요구사항 원문 버전을 검사하지만, 아직 /input에 반영되지 않은 현재 브라우저 의견/선택 변화는 해당 요청에 전달되지 않는다. 따라서 UI 버튼만 늦게 비활성화하면 충분하지 않다. 실제 Backend에서 우회 생성이 실행됐다고 보고하지는 않는다.

## 수정권고

| ID | UX 기준 | 관찰 | 권고/담당 |
|---|---|---|---|
| R01 | 공통 CSS/Grid/Title/총건수/Toolbar | 외부 요구사항 목록은 기존 BaseKitDataGrid·Title·총 2건·Excel Toolbar를 유지. 하지만 분석 입력/후보/생성 결과는 sd-analysis-table native 표로 분리되어 공통 Grid Header/행 규격·Title/총건수·Toolbar 조합을 사용하지 않음. 후보 영역에는 설명 문장 속 선택/확정 건수만 있고 총 후보 건수가 없음. | SD: 기존 DataGrid 및 Metadata/표준 Title·총 N건·Toolbar 적용. 화면별 새 Grid 스타일로 분기하지 않기. 실제 native 표 사용이 승인된 예외인지 확인 필요. |
| R02 | UX10/UX17 | 요약·업무구조·프로세스·Layout 탭과 후보 목록에서 출처 요구사항이 보이지 않음. SOURCE_REQUIREMENT_IDS는 편집 모달의 연결 요구사항에만 노출. 원본 보기는 이름·목적만 보여 Layout/출처/관계 수정 차이를 검토하기 어려움. | SD: 각 결과/후보의 출처 ID·이름을 읽기 전용 노출. 원본·편집본의 Layout/관계/출처까지 비교 가능하게 보강. |
| R03 | UX14 / Modal·Tab | 편집 모달을 열어도 focus가 배경 ‘편집’ 버튼에 남음(모달 내부 focus=false). FormModal은 실제 재사용하나 진입/trap/복귀가 없음. BaseTabs는 클릭 전환은 되지만 방향키/roving focus 구현이 없음(소스 대조). | COMMON: 기존 CUX-05 및 공통 Tabs 키보드 지원 보완. SD에서 별도 Modal/Tab을 만들지 않기. 키보드 배경 조작·모달 우회도 재검수. |
| R04 | UX12 / 생성 확인 | 실제 생성 확인 모달은 확정 건수·제외 범위만 표시. 프로젝트, 후보명/출처, 사용자 변경 요약이 없음. 생성 결과에 ID는 표시하지만 프로그램 열기/재조회 안내는 없음. | SD: 생성 대상과 최종 편집본 요약을 확인하고 재조회/결과 진입을 명확히 제공. 생성 성공으로 DB 재조회 통과를 단정하지 않기. |

## 통과 항목 — 제품 화면/fixture 범위

| 항목 | 결과 |
|---|---|
| 4단계 명칭·활성 단계 | 요구사항 준비/분석/결과 검토/확정·생성 표시 확인 |
| 분석 내부 상태 | ANALYZING은 2. 분석으로 표시, 입력 checkbox 잠금, 가짜 퍼센트 없음 |
| 결과 5개 탭 | 요약/업무메뉴·역할·액션/프로세스/Layout 추천/후보 실제 클릭 전환 확인 |
| 기본 후보 선택 0건 | 미선택·확정 버튼 비활성 확인 |
| 후보 선택→사용자 확정 | 요청/응답 fixture를 통한 화면 전환 확인, 자동 확정 없음 |
| 후보 편집·원본 구분 | 저장 후 ‘수정됨’, 원본 이름·목적 읽기, 확정 해제·생성 비활성 확인 |
| 서버 STALE 응답 수신 이후 | 기존 결과 유지, 후보 선택/확정/생성 모두 비활성 확인. B01의 입력 변경 직후/오류/0건 경로는 별개 |
| 재분석 응답 이후 | 결과 버전 증가·후보 선택 0건·미확정으로 복귀 확인. 실제 LLM 재분석은 미검증 |
| 생성 완료 상태의 재생성 UI 차단 | GENERATED_YN=Y 후보의 선택과 생성 버튼 비활성 확인. 실제 중복 저장 방지는 미검증 |
| 기존 공통 재사용 | PageHeader/Workspace/외부 Grid·Title·총건수·Toolbar/BaseTabs/FormModal/BaseKitMessage 사용 확인. R01/R03의 규격·동작 부족은 별도 |
| 범위 구분 | SD Program과 시스템 Menu/Role/Action/Runtime/권한/DB Table 자동생성을 구분하는 안내 확인. 실제 데이터 변경 경계는 미검증 |

## 미검수/후속

실제 Excel 정상·오류·중복 반영(UX01~04), 실제 연결 실패/빈/구조 오류(UX07), 오프로젝트·늦은 응답(UX08), 부분 실패의 실제 DB 복구/재진입(UX13), 기존 CRUD·첨부 회귀(UX15), 승인 권한 검증은 미완료다. UI fixture로 표시되는 성공을 해당 항목 통과로 확장하지 않는다.

다음 검수는 수정 SD SHA와 실행 방법/검수 URL, 승인 테스트 프로젝트·Excel, 실제 LLM·DB 연결 증거, 분석/확정/생성/재조회 API 상태 및 Mock 범위를 받아 재개한다. 실패 UX 기준: UX09/11/13/14, 최종 승인 차단 증거: UX06/12/13. 기존 승인 디자인 산출물은 변경하지 않는다.
