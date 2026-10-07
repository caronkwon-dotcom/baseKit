# SD 요구사항 그룹 UI 표준 재정렬 — 2026-10-07

## 작업 기준
- 작업 위치: G:/CARON/basekit/sd, sd-work. 신규 branch/worktree 없음.
- origin fetch 완료. origin/dev-pm a2c6088은 HEAD cb4dd1d의 조상으로 이미 포함됨. 차이는 기존 SD 검수 문서 2개 commit뿐이며 추가 기준 통합과 충돌 없음.
- dev-pm 소스 개발/merge 없음. 이번 작업은 sd-work commit/push로 종결.

## 변경 파일과 영향
### 공통 수정
- frontend/src/styles.css: 공통 Form Label text-align:left, justify-content:flex-start. Master 영역 내 검색+Grid 높이 배분과 내용 높이 Detail 옵션 스타일. 동일 FormField/MetadataForm 및 MasterDetailMultiGrid 화면에 적용.
- frontend/src/components/common/MasterDetailMultiGrid.tsx: 선택 가능한 detailTopSizing=content와 detailEmpty 슬롯. 기존 비율/stacked/resizable 기본 계약 유지.
- frontend/src/components/grid/basekitGrid.css: 공통 Grid 안 ActionButton을 24px로 맞추고 버튼 셀의 trailing ellipsis 제거. 공통 row height 32px 유지.
### SD 수정
- frontend/src/modules/standard-design/ui/pages/RequirementGroupPage.tsx: 첫 그룹 자동 선택, 0건 전체 Empty, 기존 SearchPanel과 요구사항 관리의 기본 접힌 검색 흐름 재사용, 공통 Toolbar에 그룹 Action 배치. 포함 사유는 공통 Grid editor, row 제거/구성 컬럼 제거, Checkbox 다중 선택 Toolbar 행 삭제. 새 그룹/그룹 전환/저장 시 선택 초기화, 삭제 후 남은 첫 그룹 선택.
- frontend/src/modules/standard-design/requirementgroup/requirementGroupApi.ts: 기본 첫 행 선택과 구분한 명시적 연관 그룹 이동 요청. 기존 요구사항 상세에서 특정 그룹 이동 보존.
- 본 문서와 docs/basekit-current-status.md: 완료 범위/검증/제약 동기화.

SD 전용 CSS, 신규 디자인 토큰, 독자 Grid/Form/Layout 없음. API/DB/migration 변경 없음.

## 검증 결과
- npm run build / npm run lint 통과. 기존 번들 500kB 크기 경고는 유지.
- node --experimental-strip-types --test frontend/tests/*.test.mjs: 55건 통과.
- npm run backend:test -- -Plocal: 51건 중 46건 통과, 외부 PostgreSQL 조건 5건 skip, 실패/오류 0.
- git diff --check 통과.
- 실제 브라우저: 5176 SD frontend + 8083 별도 H2 memory DB. 임시 fixture만 사용.
- 0건 우측 전체 Empty 확인. 두 그룹 중 첫 행 자동 선택 및 이전 선택 복원으로 첫 행이 바뀌지 않는 문제 제거 확인.
- 검색 펼치기/조회/0건 검색/초기화/접기 확인. 검색 밖 기존 Detail 보존.
- 그룹 저장/확정/구성 수정 Toolbar 배치, 확정 후 입력/행 삭제 disable 확인.
- 포함 사유 double-click 공통 editor 편집 확인. Checkbox 두 행 선택 후 행 삭제: 3건→1건, 저장/새로고침 후 1건 유지.
- 구성 컬럼/row 제거 버튼 없음. 1280×720에서 버튼 뒤 ellipsis 없음.
- 공통 row 32px, 기본정보 151px, 하단 Grid 404px, 둘 사이 공통 간격 8px 측정.
- 그룹명/설명 Label left/flex-start 확인. 요구사항 관리 목록/상세/기본정보/연관정보 회귀 확인, 해당 Form Label 전체 left/flex-start. Console error 0.
- 요구사항 상세에서 닫힌 그룹 화면을 여는 연관 그룹 이동 확인.

## 남은 이슈와 범위
- 외부 PostgreSQL/인증 Host의 통합 검수는 이번 UI 수정 범위 밖이며 H2로 대체했다고 완료 처리하지 않음.
- 공통 Form을 사용하는 모든 개별 화면을 브라우저 전수 검수하지는 않음. 요구사항 관리와 그룹 관리 실제 검수 및 공통 회귀 테스트 통과.
- 그룹 삭제 후 첫 그룹 선택 로직은 구현/정적 확인. 실제 제품 DB 삭제 검수는 수행하지 않음.
- 추가 검수 수정은 다음 별도 commit/push 단위로 처리.

## 추가 검수 반영 — 공통 버튼·검색·팝업 (2026-10-07)

사용자 첨부 화면의 후속 지적을 별도 작업 단위로 반영했다.
- RequirementGroupPage.tsx: 저장/확정/삭제를 PageHeader의 공통 버튼 영역으로 이동. 저장은 공통 SAVE 표현, 이름은 저장/확정/삭제로 통일. 기본정보 Toolbar에는 제목만 유지. 확정 상태의 구성 수정과 기존 enable/disable 업무 로직은 보존.
- SearchPanel.tsx + styles.css: 공통 inline 배치 옵션 추가. Label 76px(기존 Project 폭 또는 fallback), 입력 나머지 폭, 한 열 조건, 하단 우측 초기화/조회. 신규 디자인 토큰 없음.
- RequirementGroupPage.tsx / RequirementIntakePage.tsx: 동일 inline 검색 배치 사용. 요구사항 LIST 모드의 기존 grid 검색 배치는 유지.
- FormModal.tsx: 기존 Footer에 선택적인 footerActions 슬롯 추가. 미저장 그룹 변경의 변경 버리고 이동을 본문에서 하단 취소/저장 후 이동과 같은 줄로 이동. 다른 변경 검토·초안 비교 팝업은 기존 공통 Footer를 이미 사용하며 유지.

검증: build/lint/diff check 통과, Frontend 55건 통과, Backend 51건(46통과/5 외부 PostgreSQL 조건 skip). 5176 수정 프론트엔드에서 실제 8080 백엔드를 조회만 했다. 저장/확정/삭제 버튼 top 82px 동일, 그룹 검색 Label 76px와 입력 251.59px, 요구사항 검색 Label 76px와 입력 441.19px 측정. 팝업 변경 버리고 이동/취소/저장 후 이동은 모두 Footer에 존재하며 top 391.39px 동일. 브라우저 Console error 0. 임시 초안은 저장하지 않고 버린 뒤 기존 화면으로 이동했다. 실제 DB 쓰기/삭제 없음. 기존 번들 크기 경고 및 외부 DB 조건 skip은 유지.

## 추가 검수 반영 — 등록 버튼 (2026-10-07)

RequirementGroupPage.tsx의 목록 Toolbar 신규 그룹 Action을 제거하고 PageHeader 공통 그룹 기능 영역의 첫 버튼을 등록(CREATE)으로 배치했다. 그룹 0건 또는 미선택 상태에서도 등록은 표시되며 프로젝트 미선택/조회 미완료/처리 중에는 비활성화한다. 기존 미저장 변경 확인과 신규 초안 생성 로직을 유지한다. Empty 안내도 등록 버튼으로 연결했다. 공통 CSS/컴포넌트와 API/DB 변경 없음.

## 같은 검수 단위 추가 반영 — 행 상태·일괄 저장·저장 활성화

- 공통 getRowState 계약을 연결하여 포함 사유/검토 기준/근거 변경은 UPDATED, 신규 구성은 INSERTED, 행 삭제 예정은 DELETED로 표시한다. 기존 공통 색상·아이콘·취소선 스타일을 재사용하며 새 CSS 없음.
- 삭제 예정 행은 화면에 남고 편집/내용 검토를 비활성화한다. 저장 요청 구성에서만 제외하며 서버에는 저장 시 일괄 반영된다. 저장 성공 후 조회 기준과 삭제 표시를 초기화하고 실패 시 초안을 유지한다. 변경 버리기/그룹 이동으로 기존 구성을 복원한다. 삭제 예정 항목을 다시 추가하면 기존 초안 값을 복원하여 중복 행 없이 삭제 표시를 해제한다.
- 저장은 수정 여부와 관계없이 활성화한다. 처리 중/확정 읽기전용 상태만 disable. 원래 확정 제약은 유지한다.
- requirementGroupRowState.ts와 회귀 테스트 추가: 신규/수정/원복/저장 기준 재설정/Revision 변경/조회 snapshot 비변경을 검증했다.
- 최종 build/lint/diff check 통과, Frontend 56건 통과, Backend 51건(46통과/5 skip). 실제 브라우저에서 기본 저장 활성화, 상단 등록과 신규 초안, UPDATED 및 DELETED 공통 class, 삭제 후 네 행 유지, INSERTED class, 변경 버리고 이동 및 console error 0 확인. 실데이터 저장/삭제는 수행하지 않았다. 실제 저장 API는 기존 groupInput의 구성 원자 저장 계약을 사용한다.
