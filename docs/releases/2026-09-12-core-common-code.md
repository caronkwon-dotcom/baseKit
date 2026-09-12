# 2026-09-12 Core 공통코드 DB화

## 상태

Feature Branch 구현 / H2 및 Supabase PostgreSQL 검증 완료

## 반영 내용

- ADR-015에 따라 JPA는 Schema 검증, MyBatis는 실제 CRUD, Flyway는 물리 변경을 담당
- Flyway V2로 `BSYCDGP`와 `BSYCMCD`, 필수 FK·Unique·Check·Index 생성
- 기존 화면 Mock의 코드그룹 5건과 공통코드 20건을 초기 기준정보로 이관
- 코드그룹·공통코드 조회/등록/수정/논리삭제 REST API 구현
- 코드그룹 삭제 시 소속 코드 존재 여부와 그룹 내 코드값 중복 검증
- 공통코드관리 화면을 Backend API 조회로 전환하고 기존 중복 Mock과 camelCase 타입 제거
- Supabase PostgreSQL 17.6에 Flyway V2 적용 후 JPA Schema 검증과 MyBatis 기준정보 조회 확인

## 후속 작업

- 로그인 Context 구현 후 감사 컬럼의 `system` 임시 Actor를 로그인 사용자로 교체
- 공통 Action 권한 연결 시 화면 등록·수정·삭제 편집 UI 활성화
