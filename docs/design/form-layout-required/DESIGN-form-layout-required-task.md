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

- `LEFT`: 라벨을 입력 컨트롤 왼쪽의 고정 폭 영역에 배치
- `TOP`: 라벨을 입력 컨트롤 위에 배치

### 2-1. LEFT 규칙

다음처럼 짧고 구조화된 값에 우선 사용한다.

- 일반 Input
- Select / Combo
- Date / Time
- Code / ID
- Toggle / 간단 상태값
- 짧은 단일행 필드

표현 규칙:

- 라벨은 입력칸 왼쪽의 고정 폭 영역에서 **오른쪽 정렬**을 기본으로 한다.
- 라벨과 입력칸 간격은 공통 spacing token으로 일정하게 유지한다.
- label width를 화면별 하드코딩하지 않는다.
- 긴 다국어 label에서 입력 영역이 지나치게 좁아지지 않도록 min/max 기준을 사용한다.
- 화면 폭이 부족하면 TOP으로 전환할 수 있어야 한다.

### 2-2. TOP 규칙

다음처럼 긴 입력/설명형 컨트롤에 우선 사용한다.

- Textarea
- Description / Process Description
- 긴 자유입력
- 복합 컴포넌트
- 도움말/카운터/검증 메시지가 함께 붙는 필드

표현 규칙:

- 라벨은 입력칸 상단 시작선에 맞춘다.
- 긴 textarea는 입력 폭을 최대한 확보한다.
- validation message와 character counter 배치가 안정적이어야 한다.

### 2-3. 강제 단일 규칙 금지

Input/Select/Textarea 전체를 LEFT 또는 TOP 하나로 강제하지 않는다.

같은 화면 안에서도 짧은 필드는 LEFT, 긴 Textarea는 TOP으로 혼합할 수 있다.

## 3. Form Control 시각 규격

### 3-1. Input / Select / Combo 통일

- 일반 INPUT과 Select/Combo의 높이, border, border-radius, background를 동일 계열로 맞춘다.
- focus 상태는 BaseKit 기존 파란색 focus border/ring으로 표현한다.
- disabled/read-only는 기존 공통 톤을 따른다.
- 화면별 별도 높이·테두리 값을 만들지 않는다.

### 3-2. Combo 펼침 목록

폼 Combo의 펼침 목록은 Grid Combo와 동일한 기본 디자인 원칙을 따른다.

- 불투명 흰 배경
- 선명한 border
- 적절한 box-shadow
- control과 popup 사이 약간의 gap
- 목록 내부 padding 확보
- selected option: 파란 계열 강조 + 체크 표시
- hover option: 회색 계열 강조
- 뒤 콘텐츠가 비쳐 보이지 않음
- container overflow에 잘리지 않도록 popup layer/z-index/portal 정책 확인

## 4. Required Indicator 표준

### 4-1. 텍스트 `필수` Badge 및 `*` 기본 사용 금지

다국어 적용을 고려하여 `필수`, `Required`, `*`를 기본 Required UI로 사용하지 않는다.

### 4-2. CSS Dot Marker

필수 필드는 label 바로 뒤에 **선명한 빨간색 dot**을 표시한다.

표현 규칙:

- 작은 원형 dot
- CSS pseudo-element 사용
- label 텍스트와 dot은 같은 inline group으로 묶어 줄바꿈되지 않게 한다.
- label과 dot 사이 간격은 일정하게 유지한다.
- 상태 Badge / 오류 icon과 혼동되지 않게 크기는 작게 유지한다.
- Required dot은 필수 여부만 표현하며 Validation Error 표시로 사용하지 않는다.

예시 개념:

```css
.standard-form-label.is-required::after {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--required-indicator);
  vertical-align: middle;
  flex: 0 0 auto;
}
```

`--required-indicator`는 선명한 red semantic token으로 정의하되, validation error token과 의미상 분리한다.

### 4-3. Form 상단 안내

필수 입력 항목이 있는 Form에는 상단 안내 영역에 다음 의미를 제공한다.

> 빨간 점은 필수 입력 항목입니다.

이 문구는 다국어 대상 문자열로 관리한다. Dot 자체는 언어 비종속 시각표현으로 유지한다.

### 4-4. 접근성

시각 marker만으로 필수 의미를 전달하지 않는다.

실제 control에는 다음 중 적절한 속성을 유지한다.

- native `required`
- `aria-required="true"`

## 5. Validation 표현

Required 상태와 Validation Error 상태를 분리한다.

평상시:

- Required dot은 항상 유지
- Input/Select/Textarea는 중립 상태

저장 또는 명시적 검증 시 누락 오류가 있는 필드만:

- 빨간 border/error state
- 필요 시 약한 error background
- 필드 하단 오류 메시지
- `aria-invalid`, `aria-describedby` 연결

Required dot 자체의 색/형태를 오류 발생 시 바꾸지 않는다.

## 6. 공통 구현 검토 대상

DESIGN 팀은 현재 다음을 확인한다.

- `MetadataForm`
- `FieldDefinition`
- 공통 `FormField`
- `standard-form-grid` / `standard-form-layout`
- 공통 Form/Input/Select/Textarea CSS
- 기존 화면에서 label 배치를 강제하는 CSS/props
- required `*` 또는 텍스트 Badge 표시 구현
- Form Combo popup/dropdown 표현

기존 공통 구현이 본 기준과 다르면 화면별 임시 CSS가 아니라 공통 구조의 최소 확장으로 정리한다.

## 7. 구현 역할

DESIGN 팀은 실제 제품 화면의 UI 표현을 직접 수정할 수 있다.

허용:

- JSX label/control 배치
- CSS / className
- metadata UI 표현 props
- required marker 표현
- Form combo 시각/interaction 표현
- 반응형 layout

임의 변경 금지:

- API 계약
- DB 필수 여부 규칙
- 업무 Validation 의미
- 권한/Action Code

공통 컴포넌트 API에 최소 확장이 필요하면 COMMON 영향도를 확인하되, 이번 요구를 화면별 임시 CSS로 우회하지 않는다.

## 8. 완료 확인 기준

- Input/Select/Textarea label 위치를 LEFT/TOP으로 선택 가능
- LEFT 라벨은 고정 폭 영역에서 오른쪽 정렬
- 라벨과 입력 간격이 일정
- Textarea TOP 라벨은 입력 시작선과 정렬
- Input/Select/Combo 높이·border·radius 통일
- Form Combo popup은 흰 불투명 배경, border, shadow, selected/hover 구분
- 필수 필드에는 라벨 뒤 선명한 red dot 표시
- label + dot은 줄바꿈되지 않음
- Form 상단에 '빨간 점은 필수 입력 항목입니다' 의미의 안내 제공
- 실제 control에 required 또는 aria-required 유지
- 저장 시 누락 필드만 빨간 border + 오류 메시지
- Required dot과 Validation Error 상태가 분리
- 1280/1440/1920 및 좁은 폭에서 overlap/clip 없음
- 긴 다국어 label에서도 배치 안정
- 기존 BaseKit spacing/typography/control height 유지

## 9. 작업 절차

1. 최신 dev-pm을 기준으로 design-work 현행화
2. 현재 Form/MetadataForm/required/combo 구현 점검
3. DESIGN 기준 문서 및 실제 UI/CSS 수정
4. design-work commit/push
5. 제품에 필요한 실제 UI/공통 변경만 dev-pm 반영
6. build/lint/test 및 브라우저 검수

## 10. 완료 회신

- design-work 완료 SHA
- 수정한 DESIGN 문서
- 수정한 실제 UI/CSS 파일
- LEFT/TOP 옵션 적용 방식
- Required Dot 적용 방식
- Form Combo popup 적용 방식
- dev-pm 반영 SHA
- build/lint/test/브라우저 검수 결과
- COMMON 추가 협의 여부

## 11. 기존 구현 상태 참고

기존 구현에는 이미 `FormField`, `FieldDefinition.labelPosition: LEFT | TOP`, MetadataForm label position 결정 로직, 좁은 폭 TOP 전환, required marker, validation error 연결이 일부 반영되어 있다.

이번 작업은 기존 구현을 폐기하지 않고, 본 문서에서 확정한 **LEFT 라벨 오른쪽 정렬 / red dot / 상단 안내 / Input-Combo 시각 통일 / Combo popup 표현**까지 실제 화면 기준으로 보완하는 작업이다.
