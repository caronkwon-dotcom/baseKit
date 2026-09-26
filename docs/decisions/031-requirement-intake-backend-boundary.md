# ADR-031 Requirement Intake V1 Backend 경계

## Status

ACCEPTED — 2026-09-26

## 현재 구조와 문제

ADR-027의 첫 Lifecycle 단계는 프로젝트·WBS·요구사항·화면·DB 설계를 브라우저 JSON에 저장했다. 요구사항 접수의 설명, 프로세스, 메뉴 관계와 첨부가 이후 분석의 원본이 되려면 서버가 요구사항의 단일 원본이어야 한다. 프로젝트와 메뉴 원본의 전면 이전은 이번 범위 밖이다.

## 결정

- Requirement, Requirement ↔ Menu, Attachment 및 Attachment Metadata만 Backend canonical data로 전환한다. 프로젝트 Context는 기존 브라우저 저장 프로젝트 ID를 사용한다. 메뉴 선택 원본은 기존 `metadataRepository.getMenus()`와 Module Manifest이며 관계 테이블에는 `MENU_KEY`만 저장한다. 서버에는 별도 메뉴 Master를 만들지 않는다.
- Flyway V5는 `BSDRREQ`, `BSDRRMNU`, `BSDRATCH`를 추가한다. 서버 CRUD는 Spring REST → Service → MyBatis를 따른다. JPA Entity는 Schema 검증에만 사용한다.
- 접수 Form에서 WBS/Screen/Table ID 입력은 제거한다. 기존 LocalStorage 요구사항의 연결 ID는 명시적 이관 시 `LEGACY_*` 데이터로 보존하며 수정 API가 이를 덮어쓰지 않는다. 향후 Traceability 결과로 관리한다.
- 이관은 현재 브라우저의 실제 저장 데이터가 존재할 때 사용자가 실행한다. 각 행은 `PROJECT_ID + LEGACY_SOURCE_ID`로 재시도에 안전하게 생성되며 서버 응답을 확인한다. 기존 LocalStorage는 자동 삭제하지 않는다. 전환 후 화면 조회·저장 원본은 Backend 하나다.
- 첨부는 별도 Entity와 서버 로컬 저장 경로를 사용한다. 현재 구현은 업로드·메타데이터·다운로드·이미지 Preview·삭제다. 분석 상태는 보유하되 OCR/LLM 기능은 없다. 분석 결과는 후속 모델로 연결할 수 있다.
- Requirement와 Project의 관계는 현재 논리 참조다. 서버에는 Project Master가 없어 프로젝트 존재 검증을 할 수 없다. 메뉴 관계도 기존 Frontend Menu Metadata 키에 대한 논리 참조이며 서버 DB FK를 만들지 않는다.
- 화면은 기존 Project List-Detail Splitter와 공통 Header, Button, Grid, Message, Form 토큰을 재사용한다.

## 후속 경계

프로젝트·메뉴 원본을 서버로 전환할 때 참조 무결성과 데이터 이관 계약을 별도 결정한다. Attachment 분석은 Extracted Text, OCR Result, LLM Summary, Structured Data를 별도 결과로 연결한다. Process Definition은 구조화된 Node/Relation 데이터에서 렌더링한다. 사용자 승인 관계만 설계 자산에 반영한다.
