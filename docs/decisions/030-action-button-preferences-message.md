# ADR 030: Common Action Button Preference and Message Area

## 상태

Proposed / Implemented, 사용자 검수 대기

## 범위

공통 `ActionButton`, UI 개인화 설정, 공통코드관리의 하단 Message Area 표준에 적용한다. 화면 Layout과 AG Grid Batch CRUD 계약은 변경하지 않는다.

## 결정

- `ActionButton` 하나가 `ICON_TEXT`와 `ICON_ONLY` 표시 모드를 모두 렌더링한다. Icon-only에는 action label을 `aria-label`과 `title`로 제공한다.
- `UiPreferences`는 `skinId`, `colors`, `buttonDisplayMode`를 포함한다. Frontend LocalStorage는 `UiPreferences` Adapter 한 곳에서만 접근하고 Provider가 열린 화면에 변경을 즉시 전파한다. 기본 모드는 `ICON_TEXT`다.
- 공통 색상은 Neutral, Search, Save, Danger, Disabled semantic token으로 관리한다. Search는 dark slate Neutral, Save는 현재 Skin의 `--brand-primary`, Delete는 neutral background와 절제된 danger text를 사용한다.
- 공통 Message 컴포넌트는 `info`, `warn`, `error`, `success`를 지원하고, Code Manage는 기존 32px 하단 Message Area 안에서 INFO/WARN/ERROR를 사용한다.

## 결과

공통코드관리에서 개인화 설정을 바꾸면 새로고침 없이 버튼 표시 방식과 Skin Accent Save 색상이 즉시 반영된다. Backend, API, DB, AG Grid CRUD 로직과 기존 Master/Detail Layout은 변경하지 않는다.
