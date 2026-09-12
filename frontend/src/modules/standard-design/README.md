# Standard Design Product Module

Standard Design은 BaseKit Core 관리기능이 아니라 BaseKit 공통 계약을 사용하는 첫 번째 Product/업무 Module이다.

## 경계

- Module 진입점은 `module.tsx`다.
- 메뉴, 프로그램, 권한과 Component 연결은 Module Manifest가 소유한다.
- BaseKit Host는 `config/moduleRegistry.ts`에서 Manifest만 조립한다.
- Standard Design은 별도 사용자·권한 체계를 만들지 않고 BaseKit Runtime 권한을 사용한다.
- Standard Design이 설계하는 고객 시스템의 메뉴·역할·권한은 설계 Metadata이며 BaseKit Runtime 권한과 섞지 않는다.

## 논리적 Domain

- `project`
- `customer-standard`
- `screen-design`
- `database-design`
- `design-version`
- `llm-validation`
- `artifact`

현재 단계에서는 Domain Skeleton을 과도하게 세분화하지 않는다. 실제 Schema와 Use Case가 정의될 때 Module 내부에 필요한 폴더만 추가한다.
