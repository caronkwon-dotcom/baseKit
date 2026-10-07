# 미결정 사항 / 구현 전 협의

2026-10-07 · 아래는 신규 API·업무 정책 승인으로 취급하지 않는다.

| ID | 담당 / 확인할 계약 | DESIGN 제안 / 영향 |
|---|---|---|
| A01 | SD: 독립 그룹 분석 모델·저장/API 경계 | 기존 같은-ID RESULT_VERSION Program Analysis 및 BSDRANLS Requirement 추천과 구분. 5영역/불변 Snapshot/검토 표시 계약 정의 필요 |
| A02 | SD: 입력 범위·canonical signature·동시성 | 그룹 ID/이름/설명, 구성 ID/Revision/Requirement 본문·설계 의견 포함. 메뉴/첨부/폐기 상태 포함 범위 명시. 서버 최신성 검증 후 원자 접수 |
| A03 | SD: 실행 요청 멱등성/응답 유실/작업 복구 | 요청 식별자 조회 전 신규 실행 차단; 같은 접수 재전송은 같은 실행 확인. 재진입/RUNNING 복구·timeout 정의 |
| A04 | SD/PM: 동시 독립 실행 수·권한·비용 정책 | Prototype은 RUNNING 중 다른 실행을 허용. 제품 정책 확정 후 Gate 문구/disabled 변경; 새 Action Code를 임의 등록하지 않음 |
| A05 | SD: 검토 표시의 사용자·시각·공유 범위 | 명시적 acknowledgement. 검토 취소/재검토/리뷰 의견은 V1 미제안. 그룹 재확정/설계 채택과 분리 |
| A06 | SD: 조회 paging·정렬·부분 결과·에러 계약 | ID/시각/상태/입력 요약 및 각 영역 출처·추천 근거. 비교는 완료 2건 동일 그룹, 다른 Snapshot 비교 허용 |
| A07 | COMMON/SD: 우 Detail BaseTabs 수용 구조 | 현행 MasterDetailMultiGrid의 detailTop/detailBottom 두 영역을 통합하는 opt-in 연결점 필요 여부. 공통 레이아웃을 화면 전용 metric으로 우회하지 않음 |
| A08 | COMMON: BaseTabs 키보드·FormModal focus | Prototype만 방향키/Home/End/초기 focus/복귀 검증. 현행 공통 코드와 그룹 로컬 focus 보완을 점검하고 재사용 경계 확정 |
| A09 | SD/PM: 오류/보존/삭제·보안 표시 | V1 UI는 원본 보존, 삭제/자동 대체 없음. 사용자 오류 코드 분류·민감한 LLM 원문 비노출·권한 없는 근거 안내 필요 |
| A10 | SD: Requirement 추천과 그룹 설계 분석 연결 | 기본정보 ‘Analysis에서 추가’는 독립 추천 조회로 유지. 이번 그룹 분석 결과에서 Requirement를 자동/직접 추가하는 연결은 제공하지 않음 |

위 항목이 모두 제품 구현 완료라는 뜻은 아니다. A01~A05/A07은 구현 전에 계약을 확인해야 하며 A06/A08/A09는 개발·제품 검수 기준에 반영한다. 최신 ADR 034의 폐기 항목 유지·재확정 허용 정책은 확정된 기존 계약으로 따르고 다시 미결정으로 되돌리지 않는다.
