# Menu Structure

`Menu`는 화면 메뉴를 관리하기 위한 기본 단위다.

- `menuId`: 메뉴를 식별하는 고유 ID다.
- `parentMenuId`: 부모 메뉴 ID다. 루트 메뉴는 `null`을 사용한다.
- `menuName`: 화면에 표시할 메뉴명이다.
- `menuType`: `FOLDER` 또는 `PAGE`를 사용한다.
- `menuLevel`: 메뉴 깊이다. 현재 루트는 1, 자식은 2를 사용한다.
- `orderNo`: 같은 부모 안에서의 정렬 순서다.
- `path`: `PAGE` 메뉴의 라우팅 경로다.
- `icon`: 선택적으로 사용할 아이콘 식별자다.
- `useYn`: 사용 여부이며 `Y`인 메뉴만 활성 메뉴로 본다.

## FOLDER / PAGE

`FOLDER`는 하위 메뉴를 묶는 구조 메뉴이며 `path`를 갖지 않는다. `PAGE`는 실제 화면으로 이동 가능한 메뉴이며 `path`를 갖는다.

## Management Rule

메뉴 관리는 `menuId`를 기준으로 한다. 권한, 부모 연결, 정렬, 추적은 메뉴명이나 경로가 아니라 안정적인 `menuId`를 사용한다.

## Current Tree

- SYS 시스템관리
  - SYS_USER 사용자관리
  - SYS_ROLE 권한관리
  - SYS_MENU 메뉴관리
  - SYS_CODE 공통코드관리
- MASTER 기준정보
  - MASTER_COMPANY 업체관리
  - MASTER_ORG 부서관리
- BOARD 게시판
  - BOARD_NOTICE 공지사항
  - BOARD_FAQ FAQ
