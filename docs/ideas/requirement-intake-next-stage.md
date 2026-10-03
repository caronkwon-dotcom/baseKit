# Requirement Intake 다음 단계 사전 설계

상태: IDEA — 사용자 승인 및 별도 ADR 전

이 문서는 실데이터 E2E 이후 검토할 후보를 정리한 사전 설계다. 현재 구현 완료나 확정 Architecture로 해석하지 않는다.

## 현재 구조

- Requirement, Requirement Menu 관계, Attachment 메타데이터는 Backend canonical data다.
- Project와 Frontend Menu 후보는 논리 참조다.
- Excel Import는 Preview에서 업무 검증·Mapping 후 기존 Requirement create API를 재사용한다.
- Attachment에는 분석 상태만 있고 OCR/LLM 결과 모델은 없다.

## 관찰된 다음 문제

- Excel Import는 현재 행 단위 저장 흐름이므로 일부 행 성공·일부 행 실패 시 재실행 운영 규칙이 필요하다.
- `PROJECT_MENU_PATHS`는 사람이 읽는 경로이므로 메뉴명 변경·중복·다단계 경로에 대한 안정적인 식별 계약이 아직 없다.
- 실데이터 E2E에서 확인해야 할 것은 화면 성공만이 아니라 Import 전후의 API payload와 저장 결과의 대응 관계다.
- Attachment 분석을 시작하려면 원본 파일, 추출 텍스트, OCR 결과, LLM 요약, 구조화 결과의 보존 책임을 분리해야 한다.

## 선택지

1. 현행 유지: 행 단위 저장과 경로 기반 메뉴 매핑을 유지하고 E2E 증적만 보강한다.
2. Import Batch 도입: Import 실행을 Batch ID로 묶고 행별 성공/실패 결과와 재실행 정책을 별도 제공한다.
3. 메뉴 경로 계약 강화: Excel에는 사람이 읽는 경로를 유지하되 Preview에서 `PROJECT_MENU_ID`를 확정하고 저장 요청에는 ID만 전달한다.

## 추천 검토 순서

1. 실데이터 E2E로 현행 계약의 실패 사례와 증적 누락을 확인한다.
2. Batch 도입 여부를 결정하기 전에 행 단위 저장의 부분 성공 요구를 사용자에게 확인한다.
3. 메뉴 변경·동명이인 요구가 실제로 확인될 때만 경로 해석 계약을 ADR로 승격한다.
4. OCR/LLM은 분석 결과의 원본·재처리·실패·보안 보존정책을 먼저 승인한 후 별도 설계한다.

## 사용자 판단이 필요한 항목

- Excel Import의 부분 성공을 허용할지, 전체 원자적 성공만 허용할지
- Import 재실행을 위한 업무 식별자를 `REQUIREMENT_ID`, 별도 외부키, Batch ID 중 무엇으로 둘지
- 메뉴명 변경 시 기존 Requirement 관계를 유지할지, 재매핑 검토를 요구할지
- 첨부파일 분석 결과의 보존 기간과 접근권한을 누가 소유할지
- OCR/LLM 분석 요청을 동기 처리할지, 비동기 작업으로 분리할지

위 항목은 이번 작업에서 임의로 결정하지 않는다.

