# BASEKIT-COMMON 작업지시 — Home Widget UI V1

## 0. 작업 기준

- 저장소: `caronkwon-dotcom/baseKit`
- 작업 브랜치: `common-work`
- 제품 통합 기준: 최신 `origin/dev-pm`
- `docs/basekit-branch-integration-rules.md`가 있으면 우선 준수한다.
- 이번 작업은 **COMMON 영역의 Home 화면 UI V1 구현**이다.
- **Backend / DB / 실제 Notification API / 실제 LLM 연동 / 사용자 개인화 저장 기능은 이번 V1에서 구현하지 않는다.**
- 화면은 mock/static data로 먼저 구현한다.
- 제품 코드와 작업 문서는 commit을 분리한다.
- common-work 전체 merge를 요청하지 말고 제품 코드 commit만 별도 보고한다.

---

# 1. 목적

현재 BaseKit Home 화면의 빈 작업 영역을 **위젯 기반 Dashboard Home**으로 전환한다.

이번 V1은 기능 연결 전 단계이며 다음 두 가지를 동시에 만족해야 한다.

1. 승인된 Home Prototype 이미지와 최대한 동일한 색상·밀도·레이아웃으로 실제 화면을 구현한다.
2. 이후 사용자가 `홈 편집`을 통해 위젯을 추가/제거/재배치할 수 있도록 **위젯 배치 영역 구조를 미리 고려**한다.

이번 V1에서 실제 편집 기능을 만들지는 않는다.

---

# 2. 승인된 이미지 기준

이번 구현의 시각 기준은 사용자가 승인한 **BaseKit Home Dashboard Prototype**이다.

이미지에서 확인되는 핵심 구조를 그대로 재현한다.

## 전체 화면

- 기존 BaseKit Admin Shell / Top Navigation / MDI Tab은 그대로 유지한다.
- Home 내용만 Dashboard 구조로 변경한다.
- 전체 배경은 매우 옅은 blue-gray.
- 각 Widget은 흰색 card.
- card border는 연한 blue-gray 1px.
- radius는 작고 절제된 형태.
- 그림자보다는 border 중심의 현재 BaseKit 관리화면 톤을 유지한다.
- 과도한 gradient / glass effect / dark card 금지.

## Home Header

좌측:
- 큰 제목: `안녕하세요, admin님!`
- 작은 보조문구: `BaseKit과 함께 효율적인 업무를 시작하세요.`

우측:
- outline 스타일 `홈 편집` 버튼
- 보조 문구: `사용자별 위젯 구성이 가능합니다.`

V1에서는 버튼 클릭 기능은 없어도 된다.
단, 이후 personalization 진입점으로 사용할 수 있게 button/component 구조는 분리한다.

---

# 3. Widget 배치

기본 Desktop 기준 2열 Dashboard로 구성한다.

상단:
- 좌측: `공통 알림`
- 우측: `AI 분석 알림`

하단:
- 좌측: `오늘 할 일`
- 우측: `빠른 바로가기`

Prototype과 동일한 **2 x 2 주요 Widget 구성**으로 시작한다.

단, 구현 구조는 고정 4분할이 아니라 이후 Widget 추가/삭제/재배치를 고려해야 한다.

권장:
- Home Dashboard Grid container
- 각 Widget은 독립 component
- Widget별 key / title / span class 또는 layout metadata를 둘 수 있는 구조
- 현재는 2열 배치
- 작은 화면에서는 1열 stack

이번 V1에서는 drag/drop, resize, 사용자 저장은 구현하지 않는다.

---

# 4. 공통 알림 Widget

제목:
`공통 알림`

Header:
- 좌측 bell icon
- 제목
- 미확인 count badge
- 우측 `전체보기 >`

본문은 compact list/table 형태.

예시 컬럼:
- 구분
- 제목
- 보낸 사람
- 시간
- 작업

예시 상태 Badge:
- 검토요청
- 승인요청
- 시스템
- 공유
- 예정안내

각 행 우측:
`바로가기` 버튼

V1에서는 mock data 사용.
실제 우측 상단 Bell Notification과의 연동은 **후속 기능**이다.

단, 구조적으로 향후 동일 Notification source를 사용하도록 Widget component를 업무 데이터와 분리한다.

---

# 5. AI 분석 알림 Widget — 중요

이번 Home V1의 핵심 Widget이다.

제목:
`AI 분석 알림`

Header:
- AI/Spark icon
- 제목
- 미확인 count badge
- 우측 `전체보기 >`

상단 안내:
`AI 권한이 있는 모듈에서만 사용 가능합니다.`

본문:
AI/LLM 비동기 분석 결과 목록.

예시 컬럼:
- 상태
- 분석 명
- 모듈 / 그룹
- 분석 ID
- 완료 시간
- 작업

예시 row:

```
분석 완료 | 요구사항 유사도 분석 | 요구사항 관리 / 모바일 앱 고도화 | AI-20241210-001 | 14:22 | 결과 보기
재검토 필요 | 요구사항 품질 검토 | 요구사항 그룹 / 차세대 시스템 구축 | AI-20241210-002 | 11:48 | 검토하기
분석 실패 | 업무 프로세스 요약 | Standard Design / 업무 프로세스 정리 | AI-20241209-005 | 16:10 | 확인
```

상태 표현:
- 분석 완료: green
- 재검토 필요: orange
- 분석 실패: red

하단:
`사용 가능 모듈` 영역

예시 chips:
- 요구사항 관리
- 요구사항 그룹
- Standard Design

---

# 6. AI Widget 권한 개념

AI 분석 알림 Widget은 모든 사용자가 항상 보는 Widget이 아니다.

향후 원칙:

> 사용자가 접근 권한을 가진 Module 중 AI 기능을 제공하는 Module이 하나 이상 있을 때만 AI 분석 알림 Widget을 사용할 수 있다.

예:

```
사용자 권한 Module
- 시스템관리
- 요구사항 관리
- 요구사항 그룹
- Standard Design

AI 사용 가능 Module
- 요구사항 관리
- 요구사항 그룹
- Standard Design

→ AI 분석 알림 Widget 사용 가능
```

반대로 AI 기능 제공 Module 권한이 하나도 없으면:
- 기본 Home 구성에서 AI Widget을 표시하지 않거나
- 홈 편집의 Widget 선택 목록에서도 제공하지 않는 방향을 전제로 한다.

**이번 V1에서는 실제 권한 판정 로직을 구현하지 않는다.**

대신 UI mock/config에 다음 개념을 표현할 수 있도록 구조만 열어둔다.

예:
```
widgetKey: AI_ANALYSIS_NOTIFICATION
requiredCapability: AI_ANALYSIS
allowedModules: [...]
```

이 값은 V1 mock/local constant여도 된다.

---

# 7. 오늘 할 일 Widget

제목:
`오늘 할 일`

Header:
- check icon
- count badge
- 우측 `전체보기 >`

본문:
- checkbox
- 업무 내용
- 관련 정보
- 기한
- overflow action

예시:
- 요구사항 그룹 검토
- 화면정의서 승인
- AI 분석 결과 검토
- 주간 회의 자료 준비

V1 mock only.

---

# 8. 빠른 바로가기 Widget

제목:
`빠른 바로가기`

Header 우측:
`편집`

본문:
2열 또는 3열 shortcut tile.

Prototype 기준 예시:
- 요구사항 관리
- 요구사항 그룹
- Standard Design
- 프로젝트 관리
- 시스템 설정
- 개발자가이드

각 tile:
- pastel icon box
- title
- short description
- 우측 chevron

V1에서는 navigation 실제 연결은 선택 사항.
현재 route가 명확한 항목만 기존 route로 연결하고, 불명확하면 click 기능 없이 시각 구현만 한다.

---

# 9. 시각 규격 — 이미지 분석 기준

승인 이미지와 최대한 동일하게 맞춘다.

## 색상
- Page bg: 아주 옅은 blue-gray
- Widget bg: white
- Border: light blue-gray
- Primary: BaseKit blue
- AI accent: violet/purple
- Success: soft green
- Warning: soft orange
- Error: soft red
- Neutral badge: light gray-blue

기존 BaseKit CSS variable이 있으면 반드시 그것을 우선하고, 이미지와 유사한 값이 이미 있다면 새 hard-code color를 만들지 않는다.

## Typography
- Widget title: 기존 BaseKit section/title보다 한 단계 강조하되 과도하게 크지 않게
- 본문/table: 현재 BaseKit Grid와 같은 compact density
- count badge: 작은 pill/circle
- Header와 list 사이 간격은 compact

## Spacing
- Dashboard 외곽 padding: 기존 page spacing 유지
- Widget 사이 gap은 일정
- Widget 내부 padding은 약 16px 전후의 시각 밀도
- Header / list / footer 영역 간 불필요한 큰 여백 금지

## Button
- 기존 BaseKit ActionButton / outline button을 우선 재사용
- Prototype의 blue solid `결과 보기`는 primary action
- `검토하기`, `확인`, `바로가기`는 compact button

## Icons
- 기존 프로젝트 icon library 우선 사용
- 새 icon package 추가 금지

---

# 10. Responsive

Desktop:
- 기본 2열

Tablet/Narrow:
- 1열 또는 안정적인 2→1 전환
- Widget 내부 table/list가 page 전체 horizontal scroll을 만들지 않게 한다.
- 필요 시 Widget 내부 overflow 적용

Mobile까지 완전 제품 최적화는 V1 목표가 아니지만 layout 붕괴는 없어야 한다.

---

# 11. 구현 구조

권장 component 예:

```
HomePage
 └ HomeDashboard
     ├ CommonNotificationWidget
     ├ AiAnalysisNotificationWidget
     ├ TodayTaskWidget
     └ QuickMenuWidget
```

또는 현재 BaseKit component 구조에 맞춰 이름을 조정한다.

중요:
- HomePage 안에 모든 JSX를 한 덩어리로 넣지 않는다.
- Widget 단위로 component를 분리한다.
- 향후 Registry 기반 personalization이 가능하도록 Widget container/header/body 패턴을 공통화할 여지를 둔다.
- 그러나 이번 V1에서 과도한 Widget framework를 새로 만들지는 않는다.

---

# 12. V1 구현 범위

이번 작업에서 수행:

- Home 화면 실제 UI 구현
- 승인 Prototype과 동일한 visual hierarchy 재현
- 공통 알림 Widget
- AI 분석 알림 Widget
- 오늘 할 일 Widget
- 빠른 바로가기 Widget
- mock data
- 홈 편집 버튼 자리
- Widget 추가/배치 확장을 고려한 layout 구조
- AI Widget module/capability mock metadata 구조
- Responsive 기본 확인
- build/lint/test/browser 검증

---

# 13. 이번 작업에서 제외

- 실제 Notification DB/API
- 우측 상단 Bell과 실제 데이터 연동
- WebSocket/SSE/push
- 실제 LLM 완료 이벤트
- 사용자별 Widget 저장
- drag/drop
- resize
- Widget catalog 관리 화면
- 실제 Module 권한 판정
- Widget별 서버 설정
- Today Task 실제 업무 데이터
- 실제 바로가기 사용자 설정

이 기능들은 후속 작업이다.

---

# 14. 검수 포인트

브라우저에서 반드시 실제 화면 확인.

1. 승인 Prototype 이미지와 전체 색상/배치/밀도 비교
2. 기존 BaseKit Shell/MDI/Top Nav 훼손 여부
3. 2x2 Widget 균형
4. 공통 알림과 AI 알림의 시각적 역할 분리
5. AI Widget purple accent가 과하지 않은지
6. Widget title/count/action 정렬
7. list row 높이와 table density
8. viewport 축소 시 layout 붕괴/페이지 horizontal overflow 여부
9. 기존 Home 대비 회귀 없는지
10. console JavaScript error 0

가능하면 구현 전/후 screenshot을 남긴다.

---

# 15. 완료 보고

완료 시 다음을 보고한다.

- 시작 기준 dev-pm SHA
- common-work 작업 SHA
- 변경 파일
- Home UI product code commit SHA
- 작업 문서 commit SHA
- build / lint / test 결과
- browser 검수 결과
- screenshot 위치
- 실제 구현한 mock 범위
- 후속 기능 목록
- dev-pm 반영 대상 product commit SHA

브랜치 전체 merge 금지.
제품 코드 commit만 dev-pm 선택 반영 대상으로 보고한다.
