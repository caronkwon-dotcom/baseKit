# 개발자가이드 - 고급 검색 페이지 샘플 Type 2

## 목적

Type 2는 검색조건이 많은 업무화면을 위한 기본 3단 프로토타입이다. 초급 개발자가 Page 파일 하나를 위에서 아래로 읽으며 화면 전체를 파악하고, 공통 정책은 BaseKit 컴포넌트에 맡기는 구조를 검증한다.

## 화면 구성

- 메뉴 Context와 프로그램 개요
- 12개 검색조건, 기본 3단
- 공통 조회·초기화·접기·펼치기 Action Rail
- 접을 때 첫 1단 유지와 `+N 추가조건`
- 조회 건수·완료·긴급 요약
- Excel 보조동작
- 10개 컬럼 업무 요청 Grid

## 파일 구조

```text
searchSampleType2/
├─ SearchSampleType2Page.tsx       자주 수정하는 화면 정의와 조립
├─ searchSampleType2.types.ts      검색조건과 API Row 계약
├─ searchSampleType2.repository.ts 조회/API Adapter 경계
├─ searchSampleType2.mock.ts       API 연결 전 데이터
└─ index.ts                        외부 공개 범위
```

단순 화면 설정을 별도 config 파일로 다시 나누지 않는다. Page가 과도하게 커지거나 여러 화면에서 설정을 공유할 때만 추가 분리를 검토한다.

## 복사 후 Step

1. 폴더와 Page 컴포넌트 이름을 업무명으로 변경한다.
2. Page 상단 `PAGE_CONFIG`의 programKey, 메뉴 경로, 개요와 검색 단수를 변경한다.
3. `initialCondition`에 모든 검색 key의 초기값을 정의한다.
4. `searchFields`에 `key`, `label`, `controlType`, `placeholder`, `options`를 선언한다.
5. `columns`를 업무 Grid 순서에 맞게 변경한다.
6. `types.ts`에서 검색조건과 API Row 타입을 변경한다.
7. `repository.ts`의 Mock 조회를 REST Adapter로 교체한다.
8. `frontend/meta/programs.json`, `frontend/meta/menus.json`, `programRegistry.tsx`를 연결한다.
9. 조회·초기화·빈 결과·접기·긴 문자열·최대 조건 수를 검수한다.
10. build, lint와 Metadata Guard를 통과시킨다.

## 개발자가 작성하지 않는 영역

다음 UI는 Page마다 작성하지 않는다.

- 검색 input/select/date JSX
- 조회·초기화 버튼
- 접기·펼치기 버튼
- 단수별 Action Rail 크기
- `+N 추가조건`
- 검색조건 최대 개수 검증

이 영역은 `SearchPanel`이 `fields`, `rows`, 상태와 이벤트를 기준으로 자동 생성한다.

## Sample 1과 비교

- Type 1: 설정 분리형 실험 샘플과 1~5단 Layout 미리보기
- Type 2: Page 중심 구조, 실제 3단 업무검색 프로토타입

Type 2 검수 후 신규 업무화면의 기본 복사 원본을 어느 쪽으로 할지 결정한다.
