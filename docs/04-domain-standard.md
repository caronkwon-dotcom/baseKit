# Domain Standard

도메인 식별자와 코드 필드는 명명 규칙을 일관되게 유지한다.

- `_ID`: 고유 식별자 성격의 값에 사용한다.
- `_CODE`: 분류, 역할, 상태 같은 코드 값에 사용한다.
- `_NAME`: 사용자에게 표시할 이름 값에 사용한다.
- `_YN`: `Y` 또는 `N`으로 표현하는 여부 값에 사용한다.

TypeScript 객체 필드는 camelCase를 사용하되 의미는 위 규칙을 따른다. 예를 들어 `menuId`, `roleCode`, `menuName`, `useYn`처럼 작성한다.

`Y` 또는 `N` 값은 공통 타입 `Yn`을 사용한다. 직접 문자열 유니언을 반복하기보다 `src/types/common.ts`의 `Yn`을 import해 사용한다.
