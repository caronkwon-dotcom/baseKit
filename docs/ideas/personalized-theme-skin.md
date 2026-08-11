# 개인화 1단계: Theme Skin과 사용자 색상

## Status

IMPLEMENTED_PHASE_1

2026-08-11 기준 1단계 구현:

- 기존 CSS에서 추출한 고유 HEX 색상은 58개였다.
- 화면 스킨에서 변경 가능한 핵심 색상을 5개로 최소화하고 나머지는 CSS `color-mix()`로 파생한다.
- 기본 스킨과 녹색 계열 스킨을 제공한다.
- 사용자가 색상 피커로 값을 바꾸면 현재 스킨을 복사한 개인 스킨으로 즉시 저장한다.
- 선택 스킨과 개인 색상은 브라우저 저장소에 유지한다.
- 업무 상태를 나타내는 성공·정보·경고·위험 색상은 1단계 개인화 대상에서 제외한다.

## 배경과 문제

현재 `src/styles.css`에는 동일 계열의 명도 변형을 포함해 고유 Hex 색상 58개가 직접 사용된다. 화면이 늘어나면 색상 의미가 분산되고, 고객사 Skin 교체와 개인별 색상 변경이 어렵다.

## 아이디어 요약

색상을 개별 Hex가 아니라 Semantic Token으로 제한한다. 기본 Skin을 복사해 사용자 Skin을 만들 수 있고, 개인화 1단계에서는 허용된 Token만 변경한다.

### 추천 핵심 색상 Token 14개

1. `surface-app`
2. `surface-panel`
3. `surface-muted`
4. `surface-hover`
5. `text-primary`
6. `text-secondary`
7. `text-muted`
8. `border-default`
9. `border-strong`
10. `brand-primary`
11. `brand-hover`
12. `brand-soft`
13. `focus-ring`
14. `overlay-shadow`

상태 색상은 의미를 고정하고 각 상태마다 `text/background/border` 3단계로 둔다.

- success
- info
- warning
- danger
- disabled

따라서 사용자가 직접 선택하는 핵심 색상은 최대 14개로 제한하고, 상태 색상 15개는 Skin Designer가 관리하는 것을 추천한다.

## 개인화 1단계 범위

- BaseKit 기본 Skin 제공
- 프로젝트 또는 고객사 Skin 선택
- 기존 Skin 복사
- 복사본의 허용 Token 색상 편집
- 미리보기, 초기화, 저장
- 사용자별 `skinId`와 개인 Skin 저장
- 대비 기준 미달 색상 저장 차단

초기 Frontend 단계에서는 CSS Variable과 브라우저 저장소로 검증하고, 로그인·DB 도입 후 사용자 설정 API로 교체한다.

## 제외 범위

- 컴포넌트별 임의 색상 변경
- 상태 의미를 바꾸는 색상 변경
- 폰트, 간격, Border Radius까지 포함한 전체 Theme Builder
- 다른 사용자 Skin 공유와 Marketplace

## 위험 및 영향범위

- 자유 색상 허용 시 가독성과 접근성 저하
- Grid, Chart, 외부 솔루션 Adapter의 Theme Token 연결 필요
- 고객사 공식 Skin과 개인 Skin의 우선순위 필요
- 권한에 따라 개인화 허용 여부 결정 필요

## 결정이 필요한 사항

- 개인 Skin 생성 허용 대상
- 프로젝트 Skin 강제 적용 화면
- WCAG 대비 기준
- Skin 저장 위치와 변경 감사로그

## 관련 문서

- `docs/decisions/004-ui-density-compact.md`
- `docs/decisions/005-menu-ui-direction.md`
