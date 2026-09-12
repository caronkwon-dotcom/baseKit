# 공통코드관리 표준 CRUD 화면

## 반영 내용

- 코드그룹 Master와 선택 그룹의 공통코드 Detail 목록을 한 화면에 배치
- 공통 `ProgramDataGrid`의 권한 기반 신규·수정·삭제 Action 적용
- 재사용 가능한 `FormModal`과 표준 Form Layout 추가
- 코드그룹·공통코드 등록, 수정, 논리삭제 후 목록과 선택 상태 즉시 갱신
- 필수값, 정렬순서와 Backend 중복·Validation 오류 메시지 표시
- 공통코드 Program의 ADMIN 등록·수정·삭제 권한 Metadata 반영

## 검증

- Frontend Production Build 및 ESLint 통과
- Backend H2 전체 테스트 15건 통과
- Supabase PostgreSQL 17.6에서 공통코드 조회와 등록·수정·논리삭제 통합테스트 2건 통과
- PostgreSQL CRUD 검증 데이터는 Transaction Rollback으로 원복

## 제외 범위

- PROGRAM/MENU DB화
- Standard Design Module 변경
