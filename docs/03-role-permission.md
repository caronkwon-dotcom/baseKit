# Role Permission

현재 역할은 다음 네 가지를 기준으로 한다.

- `ADMIN`: 관리자
- `PURCHASER`: 구매원
- `MANAGER`: 부서장
- `VENDOR`: 협력업체

권한은 `PAGE` 메뉴 단위로 관리한다. 각 권한 행은 역할 코드와 메뉴 ID를 기준으로 읽기, 생성, 수정, 삭제, 커스텀 권한을 표현한다.

CRUDC 권한 필드는 다음 원칙을 따른다.

- `readYn`: 조회 권한
- `createYn`: 생성 권한
- `updateYn`: 수정 권한
- `deleteYn`: 삭제 권한
- `customYn`: 화면별 별도 액션 권한

`FOLDER` 메뉴는 화면 진입 대상이 아니므로 권한 행을 두지 않는다. 하위 `PAGE` 메뉴에만 권한을 부여한다.
