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

최신 dev-pm 포함 여부 확인 → 기존 지시서·검토 문서 확인 → 구현된 화면의 UI 직접 보정 → 실제 브라우저 검수 → 문서·코드 동기화 → design-work commit/push → dev-pm merge 가능 여부 판정.

기능 전체 완료를 기다리지 않고 구현된 부분부터 디자인 보정한다. 미구현 기능·미확정 상태/API를 디자인 작업으로 구현하지 않는다. 실제 연동과 API fixture 검수를 구분하고, 미통과 항목과 COMMON/SD 의존성을 남긴다. Merge는 별도 사용자 승인 대상이다.
