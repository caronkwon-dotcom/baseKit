# 007. Program Action Permission and Metadata Repository

## 상태

Accepted

## 배경

BaseKit의 메뉴, 프로그램, 액션 정보가 `frontend/meta/*.json`, TypeScript 설정, 복수의 Mock 파일에 중복되어 있었다. 권한 역시 메뉴별 CRUD Y/N 필드와 Program/Action 모델이 혼재하여 업무 액션을 확장하기 어려웠다.

## 결정

### 실행 및 권한 단위

- Menu는 탐색 계층이다.
- Program은 MDI에서 실행되는 업무 화면 단위다.
- Page는 React 구현 또는 사용자 표현에 사용하고 권한 식별자로 사용하지 않는다.
- 권한은 `ROLE × PROGRAM × ACTION_CODE`로 판단한다.

### Action Code

Action Code는 Program 접두어 없이 재사용 가능한 코드로 정의한다.

```text
USER_MGMT + SEARCH
USER_MGMT + CREATE
PURCHASE_ORDER + APPROVE
PURCHASE_ORDER + ISSUE
```

공통 액션은 `SEARCH`, `CREATE`, `UPDATE`, `DELETE`, `EXCEL_DOWNLOAD`처럼 정의하고, 업무 액션은 `APPROVE`, `REJECT`, `ISSUE`처럼 확장한다.

### 메타데이터 Source of Truth

현재 Frontend First 단계에서는 `frontend/meta/*.json`을 Mock 메타데이터 원본으로 사용한다. React 화면은 JSON을 직접 참조하지 않고 `MetadataRepository`를 통해 접근한다.

```text
Domain Contract
      ↑
MetadataRepository
      ↑
현재: meta JSON Adapter
향후: Spring REST Adapter
```

Repository는 다음 정합성을 시작 시 검증한다.

- Program, Menu, Action 키 중복
- Program이 참조하는 Action 존재 여부
- Menu의 Program 참조
- Menu의 상위 계층 및 level 일치
- 메뉴 최대 3Depth
- 권한의 Program/Action 조합 유효성

### 권한 판단

Frontend는 다음 계약으로 액션 가능 여부를 확인한다.

```ts
hasAction(roleCode, programKey, actionCode)
```

기존 `readYn`, `createYn`, `updateYn`, `deleteYn`, `customYn` 형태의 고정 권한 모델은 폐기한다.

## 영향

- `frontend/meta/programs.json`, `frontend/meta/menus.json`, `frontend/meta/actions.json`이 현재 Mock 메타데이터 원본이 된다.
- 역할별 허용 액션은 `frontend/meta/role-program-actions.json`에서 관리한다.
- React 컴포넌트 연결은 메타데이터와 분리하여 `programRegistry.tsx`에서 관리한다.
- 향후 Spring 연동 시 Repository 구현체를 API Adapter로 교체할 수 있다.
- 메뉴 표시 정책과 3Depth UI 구현은 별도 작업으로 진행한다.

## 후속 작업

- 로그인 사용자 역할과 `hasAction()` 연결
- 공통 버튼 설정과 액션 권한 연결
- Backend 권한 검증 계약
- 조직·법인·사용자 예외 및 데이터 범위 권한
- 업무 Action 로그 및 Lifecycle Transition 권한 연결
