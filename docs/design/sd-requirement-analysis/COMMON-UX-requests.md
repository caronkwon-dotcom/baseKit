# COMMON UX 요청

2026-10-05 · 기존 소스 조사에 따른 요청 · 공통 코드 직접 변경 없음

| ID | 요청·재현 | 수용 기준 | 우선순위 |
|---|---|---|---|
| CUX-01 | ExcelImportDialog: submit 후 setImporting(true), await onImport, close()의 importing 가드와 비동기 closure 상태가 다름. 실제 성공 닫힘은 재현 검증 필요 | 성공 시 Preview 초기화·닫힘 1회, 실패 시 입력 보존, 처리 중 수동 닫힘 차단 | 필수 |
| CUX-02 | selectFile에 parsing 상태·이전 result 제거·응답 순서 제어 없음. A 읽기 중 B 선택하거나 이전 Preview 반영 가능 | 파일 변경 시 이전 결과 즉시 무효화, 최신 파일만 표시, 파싱/반영 중 중복 클릭 차단 | 필수 |
| CUX-03 | headerErrors.length를 오류 행 수와 더함. blankrows:false 뒤 index+2는 빈 행이 있는 원본 번호와 불일치 가능 | 헤더 오류/오류 행 분리, 빈 행 포함 fixture의 실제 행 번호 일치 | 필수 |
| CUX-04 | FormModal은 submitting만 버튼 disabled 지원. 유효하지 않은 Import는 클릭해도 아무 피드백 없음 | submitDisabled 전달 및 한국어 제목/버튼 재사용, 차단 사유 가시화 | 필수 |
| CUX-05 | FormModal에 focus 진입/trap/복귀 없음, 고정 form-modal-title ID | 키보드 모달 경계·복귀, 다중 모달 고유 ID, 제출 중 모든 닫기 경로 차단 | 필수 |
| CUX-06 | accept=.xlsx,.xls이나 명시적 크기/행 제한·첫 Sheet 이름 인계 없음 | 현재 정책·제약 문서와 SD 호출 예. 필요한 제한은 SD 사례 확인 후 합의 | 확인 |

현재 columns/validateRow/mapRow/onImport, unknownHeaderPolicy를 유지하는 추가 props 방식 우선. 파일/행 정책 수치는 임의로 확정하지 않는다. 공통 Import에 요구사항 전용 필드·SD 분석 모델을 넣지 않는다. Header/행 오류가 있으면 전체 반영 차단이라는 기존 정책 유지.

원문: C:/Users/권현수/Documents/Codex/2026-10-05/co/outputs/COMMON-task.md
소스: G:/CARON/basekit/common/frontend/src/components/common/excel

요청은 ‘SD Excel·LLM 공통 지원 보완’ 채팅에 전달했다. 결과 회신을 받은 뒤 지원/미지원 상태와 디자인 계약을 갱신한다.

