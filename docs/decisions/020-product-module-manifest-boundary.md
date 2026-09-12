# ADR-020 Product Module Manifest 경계

## Status

ACCEPTED

## 배경

BaseKit은 독립 플랫폼 서비스라기보다 새로운 SI 프로젝트의 출발점이 되는 표준 애플리케이션 베이스다. 기존 Frontend에서 프로그램을 추가하려면 공통 `menus.json`, `programs.json`, 중앙 `PROGRAM_KEYS`와 `programRegistry`를 반복 수정해야 했다.

Standard Design은 BaseKit 내부 관리기능이 아니라 BaseKit을 실제 적용하는 첫 번째 Product/업무 Module이다. 같은 Repository와 Application에서 개발하되 Module을 제거해도 BaseKit Core가 정상 동작해야 한다.

## 결정

- BaseKit 기존 프로그램과 Metadata는 현재 구조를 유지한다.
- 중앙 Program 목록은 `CORE_PROGRAM_KEYS`로 한정한다.
- Product Module은 `ApplicationModule` Manifest로 프로그램, 메뉴, Action Metadata, 권한과 React Component 연결을 소유한다.
- Product 전용 Action Code는 Module이 선언하며 BaseKit 공통 Action 목록을 수정하지 않는다.
- BaseKit Host의 `config/moduleRegistry.ts`가 등록된 Manifest만 조립한다.
- 공통 Metadata Repository와 Program Registry는 개별 Product 구현을 알지 않고 등록된 Manifest 배열을 병합한다.
- Module ID, Program Key, Menu Key, Action Code 중복과 참조 무결성은 기존 Metadata 검증 흐름에서 차단한다.

Manifest 최소 계약은 다음과 같다.

```ts
interface ApplicationModule {
  id: string;
  programs: ProgramMeta[];
  menus: MenuMeta[];
  actions: ActionMeta[];
  permissions: RoleProgramAction[];
  components: ProgramComponentMap;
}
```

## Standard Design 경계

- 위치: `frontend/src/modules/standard-design`
- 공개 진입점: `module.tsx`
- 초기 화면: 프로젝트 관리, 고객 표준 관리, 화면 설계
- 논리 Domain: project, customer-standard, screen-design, database-design, design-version, llm-validation, artifact
- Standard Design 시스템 사용자는 BaseKit 인증·사용자·권한 계약을 사용한다.
- Standard Design이 설계하는 고객 시스템의 메뉴·역할·권한은 설계 Metadata이며 BaseKit Runtime 권한과 섞지 않는다.

## 제거 가능성 검증

`moduleRegistry.ts`에서 Standard Design import와 배열 항목만 임시 제거한 상태로 Frontend Production Build를 실행해 성공을 확인했다. BaseKit Core에는 Standard Design Program Key나 화면 Component 직접 import가 남지 않는다.

## 제외 범위

- 기존 BaseKit 화면의 일괄 Module 전환
- Backend Namespace와 Maven Module 재구성
- 인증·권한 실제 구현
- Standard Design 상세 Domain Schema와 API
- DB Schema 물리 분리
- 별도 Repository 또는 SaaS Runtime

## 다음 단계

`Screen Design Schema v0.1`은 `frontend/src/modules/standard-design/screen-design`이 소유한다. 순수 Schema/Type, 검증 규칙, Mock Repository, UI 순으로 분리하며 BaseKit에서는 공통 UI와 Runtime 권한 계약만 사용한다.
