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
- `term-glossary` (read-only source lookup)

현재 단계에서는 Domain Skeleton을 과도하게 세분화하지 않는다. 실제 Schema와 Use Case가 정의될 때 Module 내부에 필요한 폴더만 추가한다.

## 프로젝트 관리 Reference UX

- 프로젝트 관리만 `LIST 100% → 기본 30/70 List-Detail → Detail 100%` 작업 흐름을 제공한다.
- Module 내부 `ui/components/ProjectListDetailWorkspace.tsx`가 pointer·keyboard splitter와 목록 접기/펼치기를 담당한다. 현재 BaseKit Core에는 공통 List-Detail workspace가 없으므로, 반복 적용 전에는 이 구성요소를 공통화하지 않는다.
- 프로젝트명·고객명·상태의 입력 조건과 적용 조건, 조회 결과와 선택은 상세 진입·목록 접기/펼치기·목록 복귀 동안 유지한다.
- `복사`는 SIMPLE_COPY이며 프로젝트명, 고객명, 설명, 상태만 새 초안에 복사한다. ID와 관계 데이터는 복사하지 않으며 저장이 새 프로젝트를 생성한다. DEEP_COPY 정책은 [ADR 029](../../../docs/decisions/029-project-management-reference-ui.md)를 따른다.

## 표준용어집 경계

- `SD_TERM_GLOSSARY`는 `common-standard-terms-20251101.csv`를 Backend read-only Adapter로 조회한다.
- 목록 API는 exact → prefix → partial 검색과 페이징을 제공하고, 상세 API는 source row 기반 `TERM-000001` 식별자를 사용한다.
- Core registry, DB migration, 원본 CSV는 이 화면을 위해 수정하지 않는다.
- `POST /api/standard-design/terms/llm/recommend`는 질문 해석, CSV 후보 검색, 후보 제한 응답과 원본 상세 재검증만 수행하는 PoC다.

## 회사 LLM 경계

- Browser는 회사 LLM을 직접 호출하지 않고 `/api/standard-design/v1/llm` Backend API만 호출한다.
- Frontend Adapter는 Module 내부 `llm/`이 소유한다.
- 실제 URL과 API Key는 Backend 환경변수로만 관리한다.
- 현재 `화면 설계`의 연결 확인 UI는 기술 연결 점검용이며 실제 설계검증·권한 기능이 아니다.
