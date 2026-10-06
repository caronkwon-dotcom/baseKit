# ADR 034: SD 요구사항 그룹 관리 V1

- 일자: 2026-10-06
- 상태: 사용자 계약 승인, sd-work 구현 완료, dev-pm 통합 전
- 기준: DESIGN SD-implementation-handoff (81bf8896), 사용자 V1 업무 계약과 추가 답변

## 결정

그룹은 다음 설계 단계에서 함께 판단할 Requirement의 Context다. 이 메뉴에서 프로세스/화면/Program 설계나 AI 실행을 하지 않는다.

대표 REQUIREMENT_ID에 N:M으로 연결한다. 동일 그룹/Requirement는 하나이며 직접 선택(HUMAN)과 여러 독립 추천 실행의 근거를 함께 저장할 수 있다. Analysis 원본 사유는 사용자 포함 사유와 분리하고 불변으로 보존한다. 기존 Program Analysis는 같은-ID 재분석을 사용하므로 독립 추천 모델(BSDRANLS/BSDRARIT)로 대체하지 않는다. 사용자가 승인한 범위는 독립 추천 결과 저장·조회까지다.

상태는 DRAFT/CONFIRMED/REVIEW_REQUIRED다. 사용자 확정만 허용하고 확정 상태 편집에는 명시적인 편집 전환이 필요하다. 모든 Requirement 내용/상태/메뉴 관계 저장과 첨부 추가·제거·폐기는 Revision 증가 및 포함 그룹 REVIEW_REQUIRED를 발생시킨다. 대표 ID, 그룹 구성, 근거는 자동 삭제/롤백하지 않는다. 사용자는 이전 검토 snapshot과 현재 내용을 비교하고 현재 Revision의 검토 완료를 저장한 후 재확정한다.

사용자는 Requirement 삭제를 폐기로 전환하고 물리 삭제하지 않도록 명시했다. DELETE 응답은 기존 204이며 실제 처리에 DISCARDED_YN=Y를 저장한다. 첨부파일과 메뉴 관계도 유지한다. 반복 폐기는 멱등이다. 폐기 항목 유지 재확정은 허용하고 폐기 사실은 표시한다. 과도한 그룹명 중복/구성 수 제한은 없다.

기본정보/구성/근거는 원자 저장하며 프로젝트 복합 FK, 구성/근거 unique, 존재 검증으로 무결성을 지킨다. VERSION 충돌은 409로 거절하고 초안은 유지한다. 검토 Revision이 현재보다 오래되면 확정하지 않는다. 기존 행 이력은 첫 변경 시 baseline을 확보하고 이후 snapshot을 기록한다.

제품 UI는 기존 Grid/Title/Form/Modal/Toolbar/spacing/CSS를 재사용한다. 독립 스타일 체계를 만들지 않는다. Requirement 상세에는 포함 그룹 조회/이동만 제공한다.

## 영향과 검증

V12/V13만 추가하고 기존 migration은 수정하지 않았다. 기존 Requirement 삭제 후 완전 제거를 기대하던 동작과 관련 Project Menu 삭제 기대값은 폐기/관계 보존 계약에 맞춰 변경한다. 상세 변경 파일/API/검증 결과와 미검증 통합 항목은 [V1 구현 보고](../sd-requirement-group-v1-progress.md)를 따른다.

Backend H2 46건 실행 통과/5 skip, frontend 55건 통과, build/lint/diff check 통과. 브라우저에서 폐기·재검토·재확정·근거 보존을 확인했다. PostgreSQL 적용과 인증 Host grant는 별도 통합 검수 대상이다.