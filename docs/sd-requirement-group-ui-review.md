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
