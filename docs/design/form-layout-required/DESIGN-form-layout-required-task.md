# DESIGN 작업지시 — Form Label 배치와 Required Indicator 표준

작성일: 2026-10-05
기준 브랜치: `design-work`
대상: BaseKit Form / MetadataForm / 신규·수정 화면의 Input, Select, Textarea 라벨 배치와 필수 표시

## 1. 목적

BaseKit 입력 화면의 라벨 배치를 하나의 강제 규칙으로 고정하지 않고, 입력 유형과 화면 밀도에 따라 `LEFT` 또는 `TOP`을 선택할 수 있는 공통 DESIGN 기준을 정의한다.

필수 입력 여부는 다국어 적용을 고려하여 `필수` 같은 텍스트 Badge를 사용하지 않고, CSS 기반의 언어 비종속 Required Marker로 표현한다.

프로토타입은 UX 검토용이며 실제 제품 적용 시 BaseKit 공통 CSS, Form/Grid/Toolbar/Spacing 규격을 우선한다.

## 2. 라벨 배치 기준

Form Field는 메타데이터 또는 공통 props에서 라벨 위치를 선택 가능하게 한다.

권장 값:

- `LEFT`: 라벨을 입력 컨트롤 왼쪽에 배치
- `TOP`: 라벨을 입력 컨트롤 위에 배치

DESIGN 원칙:

### 2-1. LEFT 권장

다음처럼 짧고 구조화된 값에 우선 사용한다.

- 일반 Input
- Select / Combo
- Date / Time
- Code / ID
- Toggle / 간단 상태값
- 짧은 단일행 필드

장점:

- 화면 세로 길이 절약
- SI 업무 화면의 정보 밀도 향상
- 여러 짧은 필드의 비교가 쉬움

주의:

- label width를 화면별 하드코딩하지 않는다.
- 긴 다국어 label에서 입력 영역이 지나치게 좁아지지 않도록 max/min 기준을 둔다.
- 화면 폭이 부족하면 TOP으로 자연스럽게 전환할 수 있어야 한다.

### 2-2. TOP 권장

다음처럼 긴 입력/설명형 컨트롤에 우선 사용한다.

- Textarea
- Description / Process Description
- 긴 자유입력
- 복합 컴포넌트
- 도움말/카운터/검증 메시지가 함께 붙는 필드

장점:

- 입력 폭 최대 확보
- 긴 한글/영문/다국어 label 대응 용이
- validation message와 character counter 배치가 안정적

### 2-3. 강제 단일 규칙 금지

Input/Select/Textarea 전체를 LEFT 또는 TOP 하나로 강제하지 않는다.

기본값은 공통 화면 밀도와 기존 BaseKit 표준을 기준으로 하되, 화면/필드 유형에 따라 명시적으로 선택 가능해야 한다.

같은 화면 안에서도 짧은 필드는 LEFT, 긴 Textarea는 TOP으로 혼합할 수 있다.

## 3. Required Indicator 표준

### 3-1. 텍스트 `필수` Badge 사용 금지

다국어 적용을 고려하여 화면에 `필수`, `Required` 등의 고정 텍스트 Badge를 기본 규칙으로 사용하지 않는다.

### 3-2. CSS Marker 사용

필수 필드는 label 바로 옆에 언어 비종속 marker를 표시한다.

권장 기본안:

- 작은 원형 dot
- 크기 약 4~6px 범위 검토
- label baseline과 자연스럽게 정렬
- 상태 Badge / 오류 아이콘보다 시각 강도 낮게 유지
- 기존 semantic token 또는 required 전용 token 사용
- SVG/Icon 컴포넌트 의존 없이 CSS pseudo-element 사용 가능

예시 개념:

```css
.form-label.is-required::after {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--required-indicator);
  vertical-align: middle;
}
```

정확한 px/token은 기존 BaseKit typography/spacing token을 먼저 확인한 뒤 확정한다.

### 3-3. 접근성

시각 marker만으로 의미를 전달하지 않는다.

필수 필드는 실제 control에 다음 중 적절한 속성을 유지한다.

- native `required`
- `aria-required="true"`

screen reader용 의미는 DOM/ARIA로 전달하고, 화면 marker는 언어 비종속 시각 힌트 역할만 한다.

### 3-4. Required와 Validation Error 구분

필수 여부와 오류 상태를 색/아이콘 하나로 혼합하지 않는다.

- Required: 항상 동일한 marker
- Error: input border / background / error message로 별도 표현

저장 시 미입력 오류가 발생해도 Required Marker 자체를 경고 아이콘이나 큰 red Badge로 바꾸지 않는다.

## 4. Validation 표현

평상시 입력 중에는 중립 상태를 유지한다.

저장 또는 명시적 검증 시:

- 오류 필드 border/error state 적용
- 필드 하단에 명확한 오류 메시지 표시
- focus 이동 또는 summary가 필요한 화면은 기존 BaseKit 검증 흐름 준수

오류 메시지는 다국어 대상 문자열이며 Required Marker와 별개로 관리한다.

## 5. 공통 구현 검토 대상

DESIGN 팀은 현재 다음을 확인한다.

- `MetadataForm`
- `FieldDefinition`
- `standard-form-grid`
- 공통 Form/Input/Select/Textarea CSS
- 기존 화면에서 label 배치를 강제하는 CSS/props
- required `*` 표시 구현

기존 `*` 또는 텍스트 `필수`가 공통에 하드코딩되어 있으면, 신규 marker 표준으로 전환 가능한 구조를 제안/수정한다.

## 6. 구현 역할

DESIGN 팀은 실제 제품 화면의 UI 표현을 직접 수정할 수 있다.

허용:

- JSX label/control 배치
- CSS / className
- metadata UI 표현 props
- required marker 표현
- 반응형 layout

임의 변경 금지:

- API 계약
- DB 필수 여부 규칙
- 업무 Validation 의미
- 권한/Action Code

공통 컴포넌트 API에 최소 확장이 필요하면 COMMON 영향도를 확인하되, 이번 요구를 화면별 임시 CSS로 우회하지 않는다.

## 7. 완료 확인 기준

- Input/Select/Textarea label 위치를 LEFT/TOP으로 선택 가능
- 짧은 필드 LEFT 배치 시 입력 폭과 정렬 안정
- Textarea TOP 배치 시 충분한 입력 폭 유지
- 1280/1440/1920 및 좁은 폭에서 깨짐 없이 동작
- 긴 다국어 label에서 overlap/clip 없음
- 필수 필드에 텍스트 `필수` 대신 CSS marker 표시
- marker는 상태 Badge/오류 icon과 혼동되지 않음
- control에 `required` 또는 `aria-required` 유지
- validation error는 border/message로 별도 표현
- 기존 BaseKit spacing/typography/control height 유지

## 8. 작업 절차

1. 최신 dev-pm을 기준으로 design-work 현행화
2. 현재 Form/MetadataForm/required 구현 점검
3. DESIGN 기준 문서 및 실제 UI/CSS 수정
4. design-work commit/push
5. 제품에 필요한 실제 UI/공통 변경만 dev-pm 반영
6. build/lint/test 및 브라우저 검수

## 9. 완료 회신

- design-work 완료 SHA
- 수정한 DESIGN 문서
- 수정한 실제 UI/CSS 파일
- LEFT/TOP 옵션 적용 방식
- Required Marker 적용 방식
- dev-pm 반영 SHA
- build/lint/test/브라우저 검수 결과
- COMMON 추가 협의 여부
