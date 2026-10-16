# DESIGN 역할과 완료 기준

2026-10-05 · 사용자 역할 정정 · 최신 dev-pm의 실제 코드를 기준으로 적용한다.

DESIGN의 본분은 제품 디자인 품질이다. 개발 전에는 UX 흐름·프로토타입·상태·표현 기준을 설계하고, 개발 후에는 실제 화면을 열어 UI 표현 코드를 직접 보정하고 검수한다. 문서 작성과 구현팀 인계만으로 종료하지 않는다.

## 직접 수정할 범위

- 기존 구조 안의 JSX 배치, className, CSS, spacing/padding/density
- Title/Section Title/총건수, Grid cell renderer의 표현, Badge/Label/Select
- Toolbar 정렬과 조합, responsive/overflow/focus/hover
- 공통 CSS의 표현 보정은 영향 범위를 확인하고 직접 적용한다. 공통 코드라는 이유만으로 모두 COMMON에 넘기지 않는다.

API 계약, DB, 권한 로직, Action Code 의미, 업무 데이터 매핑·저장 값은 변경하지 않는다. 새 공통 연결점이나 공통 구조/API 확장이 꼭 필요하면 COMMON 요청으로 분리한다. 업무 기능·데이터 계약은 SD/화면 구현팀과 협의한다.

프로토타입은 UX 참고다. 실제 화면은 BaseKit 공통 CSS/Grid/Title/총건수/Toolbar/Action/Tab/Modal 규격을 우선한다. 화면 전용 absolute/음수 margin/임의 metric으로 공통 구조 부족을 우회하지 않는다.

## 작업과 완료

최신 dev-pm으로 design-work 현행화 → 기존 지시서·검토 문서 확인 → 실제 화면 UI 직접 보정 → 검증 → design-work에 모든 변경 commit/push → DESIGN 내부 산출물과 제품 UI 코드 분류 → 제품에 필요한 UI commit만 dev-pm cherry-pick → dev-pm build/lint/관련 테스트·브라우저 재검수.

제품 UI 코드와 DESIGN 내부 문서·프로토타입·검수 스크립트는 별도 commit으로 작성한다. DESIGN 내부 산출물은 제품 동작에 필요하지 않으면 dev-pm에 반영하지 않는다. 문서가 제품 계약에 꼭 필요할 때만 근거를 기록하고 별도 반영한다. design-work 전체 merge로 내부 산출물을 함께 섞지 않는다. 이미 병합된 과거 문서는 이번에 삭제하거나 이력을 재작성하지 않는다.

기능 전체 완료를 기다리지 않고 구현된 부분부터 디자인 보정한다. 미구현 기능·미확정 상태/API를 디자인 작업으로 구현하지 않는다. 실제 연동과 API fixture 검수를 구분하고, 미통과 항목과 COMMON/SD 의존성을 남긴다. 이번 요청은 위 순서의 commit/push 및 제품 UI만 dev-pm 반영을 승인한다. main 승격은 별도 승인 대상이다. 공통 구조/API 확장은 COMMON 협의로 분리하되 사용자가 이번에 승인한 최소 Toolbar 연결점은 직접 구현한다.
