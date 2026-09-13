# ADR-026 Metadata Field Rendering Contract

- 상태: 승인 / 구현 중
- 범위: BaseKit Core/Shared UI, 공통코드 속성

## 결정

업무 Metadata와 화면 표현 Metadata를 분리한다. 공통코드의 업무 속성은 `BSYCADF`(정의), `BSYCAVL`(값)에 저장하고 다음 Adapter 흐름으로 화면에 전달한다.

`CODE_ATTRIBUTE_DEF → FieldDefinition → MetadataDataGrid / MetadataForm / Validation Renderer`

Standard Design의 Screen Item도 향후 별도 Adapter를 통해 같은 `FieldDefinition`으로 변환한다. 공유 Renderer는 Standard Design에 종속되지 않는다.

## 계약

- `DATA_TYPE`: `STRING / NUMBER / BOOLEAN / DATE / DATETIME`
- `CONTROL_TYPE`: `TEXT / NUMBER / SWITCH / SELECT / DATE_PICKER / COLOR_PICKER`
- `DISPLAY_TYPE`: `TEXT / NUMBER / BOOLEAN / DATE / DATETIME / COLOR / BADGE`
- `OPTION_SOURCE`: V1은 `CODE_GROUP:<CODE_GROUP_ID>` 형식으로 다른 활성 코드그룹을 참조한다.
- `BSYCADF`에는 업무 속성만 저장하며 `GRID_WIDTH`, `GRID_ALIGN`, `FORM_VISIBLE_YN` 같은 화면 전용 설정을 넣지 않는다.
- Grid 폭·정렬 등은 Renderer의 공통 기본 정책으로 계산한다.
- 코드목록 Grid와 등록·수정 Form은 동일한 `FieldDefinition`을 사용한다.

## 다국어 확장 원칙

V1에서는 다국어를 구현하지 않는다. 향후 CODE, CODE_GROUP, ATTRIBUTE 명칭은 원본 테이블에 언어별 컬럼을 추가하지 않고, 리소스 유형·리소스 ID·필드·Locale을 키로 하는 별도 I18N 구조로 확장한다.

## 영향범위

- Flyway V3: `BSYCADF`, `BSYCAVL`
- Core Code Attribute REST/Service/MyBatis
- Shared UI `FieldDefinition`, `MetadataDataGrid`, `MetadataForm`
- 공통코드관리 `[코드목록] / [속성정의]`
