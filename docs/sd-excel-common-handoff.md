# SD Excel·LLM 흐름 COMMON 인계 (2026-10-05)

기준: `common-work`, `frontend/src/components/common/excel`. SD 선행 계약은 BASEKIT-SD 채팅에 전달했다. 업무 요구사항 매핑, 저장·분석·확정·SD 설계 대상 프로그램 생성은 SD 소유다.

## 재사용 계약

- `columns: ExcelImportColumn[]`: `key`, `header`, 선택 `required/width/example`. key는 values의 키이며 header는 Excel 제목이다.
- `validateRow(values, rowNumber): string[]`: 동기 업무 검증. 공통 필수값 검사 결과에 추가된다. 예외를 던지면 전체 파싱 실패로 표시된다.
- `mapRow(values, rowNumber): T`: 반영 직전에 각 정상 행을 업무 DTO로 변환한다. 변환 예외도 반영 실패로 처리한다.
- `onImport(rows: T[]): void | Promise<void>`: 전체 정상 행을 한 번에 전달한다. Promise 성공 뒤 초기화·닫기, 실패 시 Preview 유지와 메시지 표시·명시적 재시도 허용. 서버의 원자성·중복 방지·재시도 안전성은 호출자가 보장한다.
- `unknownHeaderPolicy?: 'error' | 'ignore'`: 기본 error. title/submitLabel/disabled는 이번에 추가한 선택 속성이다. 기존 기본값은 유지한다.

```tsx
// 업무 DTO와 검증/저장 함수는 호출 모듈에서 정의한다.
<ExcelImportDialog
  open={excelOpen}
  onClose={() => setExcelOpen(false)}
  title="요구사항 Excel 입력"
  submitLabel="입력 반영"
  disabled={!canImport}
  columns={requirementColumns}
  validateRow={validateRequirementRow}
  mapRow={mapRequirementRow}
  onImport={saveRequirementRows}
/>
```

Import 경로는 `components/common` 또는 `components/common/excel` 공개 export를 사용한다. 회사 LLM Client는 SD에 그대로 둔다.

## 파일·Sheet·Header·행 정책

- 파일 선택 accept는 `.xlsx,.xls` 힌트다. parser 강제 확장자/MIME 검사는 없다. 원본 파일은 서버에 업로드하지 않고 arrayBuffer로 브라우저에서 읽는다.
- Import 파일 크기·행 상한은 현재 없다. 첨부 업로드의 20MB 제한은 별도 API 정책이며 Import 제한으로 전용하지 않는다. 큰 파일은 메모리·UI 지연 위험이 남는다. 제한 도입은 정책 확인 후 별도 제안한다.
- 첫 Sheet만 사용한다. Header는 Sheet 사용 범위의 첫 행, trim 후 대소문자 구분·정확 일치다. 중간 빈 행은 제외하지만 물리 Excel 행 번호는 보존한다. `!ref` 시작 행도 고려한다. 임의로 제목/안내 행을 탐색하지 않는다.
- required Header 누락·중복 Header·정의되지 않은 Header를 검증한다. ignore는 알 수 없는 Header만 허용한다. 선택 Header가 없으면 해당 값은 빈 문자열이다.
- 정의된 모든 컬럼이 빈 행은 제외한다. required 값 누락은 행 오류다. 값을 자동 정규화하지 않으며 숫자·boolean·Date 등 unknown 원본의 변환은 mapper 소유다.
- Header 오류와 오류 행 개수를 따로 표시한다. 어느 오류라도 있으면 전체 반영 차단; 부분 반영 없음. 정상 행이 0개여도 반영 차단.
- 파일 재선택 즉시 이전 결과 제거. 파싱·반영 중 선택/닫기/중복 반영을 차단하고 요청 ID로 무효화된 파싱 결과를 버린다. 호출자는 처리 중 open을 강제로 변경하거나 매핑 계약을 교체하지 않는다.

## 변경 범위와 디자인 요청 결과

1. ExcelImportDialog: parsing 상태·동기 ref 잠금·요청 ID, 이전 Preview 제거, 실패 메시지·재시도, 성공 시 직접 reset/onClose, 오류 집계 분리, title/submitLabel/disabled.
2. ExcelImport: disabled를 외부 버튼과 Dialog에 전달. 기존 버튼 명칭은 유지한다.
3. excelParser: blankrows=true 후 빈 데이터 행만 제외하여 실제 행 번호를 보존.
4. FormModal: 선택 submitDisabled 추가. 기존 기본 동작 유지.
5. 새 회귀 테스트와 이 문서, 현재 상태 갱신.

기존 성공 close 문제는 React closure 때문에 정적 코드만으로 실패를 확정하지 않았다. 수정본은 importing 상태에 의존한 close 재호출을 없앴고 실제 핸들러에서 정상 완료·오류·처리 중 닫기·중복 실행을 검증했다.

FormModal 현재 계약: Escape/배경 클릭/취소/닫기는 submitting 중 차단, 반영은 submitting 또는 submitDisabled 중 차단. role=dialog, aria-modal, 제목 연결은 있다. 초기 focus 이동·Tab focus trap·닫힌 후 focus 복원·Enter submit·중첩 Modal 고유 제목 ID는 보장하지 않는다. 이번 변경에 포괄적 focus 처리는 포함하지 않았다. 공통 Modal 전 사용처에 영향을 주는 접근성 후속 범위로 남긴다. disabled는 UI 제어이며 보안 권한 검증을 대체하지 않는다.

## 시스템 Program·Runtime·권한 인계

- ADR-020: Module Manifest는 programs/menus/actions/permissions/components를 소유하며 Host moduleRegistry가 조립한다. SD가 설계하는 고객 시스템 Program/Menu/권한은 설계 Metadata이고 BaseKit Runtime 등록과 분리한다.
- ADR-028: BSYPROG는 PROGRAM_ID/KEY/NAME, MODULE_CODE, PROGRAM_TYPE_CODE, ROUTE, DESCRIPTION, USE_YN 운영 Metadata를 관리한다. React 구현 정보는 DB에 저장하지 않는다. programRegistry는 PROGRAM_KEY→React Component 실행 연결을 소유한다. DB 등록만으로 새 코드가 생성·실행되지 않는다.
- 현재 programApi: GET/POST `/api/core/programs`, PUT/DELETE `/api/core/programs/{PROGRAM_ID}`. ProgramSave 필드는 PROGRAM_ID/KEY/NAME, MODULE_CODE, PROGRAM_TYPE_CODE, ROUTE, DESCRIPTION, USE_YN. 응답은 ApiResponse DATA.
- 권한 기준은 ROLE×PROGRAM×ACTION_CODE, ALLOW_YN=Y. SD 신규 업무 Action은 Module에서 선언한다. COMMON Excel 컴포넌트는 ROLE이나 Action을 자체 판정하지 않으며 SD가 허용 여부와 disabled/onImport 접근 검사를 연결한다. 서버 권한 집행을 이번 UI 옵션으로 완료했다고 간주하지 않는다.
- Runtime 연결이 필요하면 SD가 실행 Program key·배포된 Component/Manifest·Action·Role 요구를 제공하고 COMMON이 등록/참조 무결성/권한을 별도 검토한다. 분석 결과 확정이 시스템 Program 자동 등록을 의미하지 않는다. 이번 API/DB/권한/Runtime 변경은 없다.
- ADR-021 회사 LLM 설정·Client·보안 경계 유지. 실제 회사 접속은 이번에 검증하지 않는다.

## 검증

허용된 작업 폴더의 소스 사본에서 수정 및 검증 후 COMMON에 반영한다. 의존성은 기존 dev-pm node_modules를 사본으로 재사용했고 설치/lock 변경은 없다.

- Frontend 전체 node 테스트 42건 통과 (신규 Excel 4건 포함). 첫 Sheet·Header·필수값·빈 행·물리 행 번호·원본 값·읽기 실패와 실제 Dialog 핸들러의 재선택/동시 실행/성공 닫기/실패 재시도/disabled를 검증.
- npm run build 통과. 기존 500kB 번들 크기 경고가 남는다.
- npm run lint 통과.
- npm run backend:test 통과: 총 30건, 실패/오류 0, 외부 PostgreSQL 조건부 5건 skip. BASEKIT_DB_URL/USERNAME/PASSWORD 환경변수를 제거한 H2 격리 실행. 외부 DB 변경 없음.
- 브라우저 실화면·focus·키보드 조작 및 실제 SD 화면 연결/회사 LLM 접속은 미검증. 컴포넌트 테스트는 최소 hook host에서 실제 소스 핸들러를 실행하며 DOM 검증을 주장하지 않는다.
- 기존 ExcelImport 업무 사용처는 현재 common 소스에서 발견되지 않았다. 기존 FormModal 사용처는 build/lint와 전체 회귀 테스트로 확인했다.
