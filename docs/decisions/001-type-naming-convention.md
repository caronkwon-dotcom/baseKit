# 001. Type Naming Convention

## 상태

Accepted

## 배경

BaseKit은 업무시스템 개발을 위한 참조 아키텍처 프로젝트입니다. 이 프로젝트의 타입 정의는 화면 개발만을 위한 임시 모델이 아니라, 메타데이터, API, DB 설계와 함께 유지될 데이터 계약입니다.

업무시스템에서는 같은 개념이 여러 계층에서 반복됩니다.

- 화면의 입력 필드
- API request와 response
- DB 컬럼
- 공통코드와 메뉴 메타데이터
- mock 데이터

각 계층이 서로 다른 이름 규칙을 사용하면 매핑 코드가 늘어나고, 필드 의미가 불명확해지며, 자동 생성 기반을 만들기 어렵습니다. BaseKit은 이 비용을 줄이기 위해 타입 필드명을 메타데이터와 DB 컬럼 기준에 맞춥니다.

## 결정

TypeScript 타입의 필드명은 대문자 스네이크 케이스를 사용합니다.

```ts
export interface User extends BaseEntity {
  USER_ID: string;
  LOGIN_ID: string;
  USER_NAME: string;
  EMAIL: string;
  USER_TYPE_CODE: string;
  STATUS_CODE: string;
  USE_YN: UseYn;
}
```

공통 감사 필드는 `BaseEntity`로 분리하고, 도메인 타입은 이를 상속합니다.

```ts
export interface BaseEntity {
  CREATED_AT: string;
  CREATED_BY: string;
  UPDATED_AT: string;
  UPDATED_BY: string;
}
```

사용 여부처럼 값 범위가 고정된 필드는 별도 union type으로 정의합니다.

```ts
export type UseYn = 'Y' | 'N';
```

## 적용 범위

이 규칙은 다음 파일과 데이터에 적용합니다.

- `src/types`의 도메인 타입
- `src/mock`의 샘플 데이터
- 향후 API request와 response 타입
- 메타데이터 기반으로 생성되는 화면 모델

React 컴포넌트의 props, 내부 상태, 이벤트 핸들러처럼 UI 내부에서만 사용되는 구현 세부 타입은 일반적인 TypeScript/React 관례를 따를 수 있습니다.

## 기대 효과

- 메타데이터, API, DB, 화면 모델 간 필드명이 일치합니다.
- mock 데이터와 실제 API 데이터의 구조 차이를 줄입니다.
- 변환 코드와 중복 매핑을 최소화합니다.
- 향후 코드 생성 또는 스키마 생성 기반을 만들기 쉽습니다.

## 트레이드오프

대문자 스네이크 케이스는 일반적인 프론트엔드 TypeScript 스타일인 camelCase와 다릅니다. 따라서 React 컴포넌트 내부 코드에서는 다소 이질적으로 보일 수 있습니다.

하지만 BaseKit의 타입은 UI 구현 편의보다 업무 데이터 계약의 안정성을 우선합니다. 화면 내부에서만 쓰는 로컬 변수나 컴포넌트 props는 필요에 따라 camelCase를 사용할 수 있으나, 도메인 데이터 타입과 mock 데이터는 본 규칙을 따릅니다.

## 예외

- UI 전용 props 타입
- 컴포넌트 내부 상태 타입
- 외부 라이브러리 타입과 직접 맞춰야 하는 adapter 타입
- 브라우저 이벤트나 React 이벤트 타입

예외를 적용하더라도 API, DB, 메타데이터와 직접 연결되는 도메인 모델에는 이 규칙을 유지합니다.
