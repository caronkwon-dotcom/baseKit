# 개발자가이드 - 기본 검색 페이지 샘플 Type 1

## 1. 문서 목적

이 문서는 `devGuide/searchSampleType1` 화면을 기준으로 BaseKit의 기본 검색 페이지 작성 패턴을 정리한다.

이 샘플의 목적은 단순 화면 예제가 아니라, 신규 개발자가 폴더를 복사한 뒤 화면명, 검색조건, 컬럼, mock/service 연결부를 순차적으로 수정하여 새 메뉴를 만들 수 있는 표준 템플릿을 제공하는 것이다.

현재 단계는 React 화면 샘플 단계이며, DB/API 연동은 제외한다.

---

## 2. 구현 범위

이번 샘플에서 구현한 범위는 다음과 같다.

* 개발자가이드 메뉴 추가
* 기본 검색 페이지 샘플 화면 추가
* 공통 컴포넌트 index 추가
* 공통 Action Code 정의
* 검색조건 상태 관리
* mock 데이터 조회
* 검색조건 패널 구성
* 조회 결과 DataTable 표시

---

## 3. 폴더 구조

```text
src/features/devGuide/searchSampleType1/
 ├─ SearchSampleType1Page.tsx
 ├─ index.ts
 ├─ searchSampleType1.mock.ts
 └─ searchSampleType1.types.ts
```

### 파일 역할

| 파일 | 역할 |
| --- | --- |
| `SearchSampleType1Page.tsx` | 화면 본체. 검색조건, 이벤트, SearchPanel, DataTable 구성 |
| `searchSampleType1.types.ts` | 화면에서 사용하는 row 타입 정의 |
| `searchSampleType1.mock.ts` | API 연동 전 화면 확인용 mock 데이터 |
| `index.ts` | feature 외부 공개용 export 진입점 |

---

## 4. 주요 설계 기준

### 4.1 화면 설정은 `PAGE_CONFIG`로 관리

화면명, 설명, programKey는 페이지 상단의 `PAGE_CONFIG`에서 관리한다.

```ts
const PAGE_CONFIG = {
  programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
  title: '기본 검색 페이지 샘플 Type 1',
  description:
    '검색조건 1단 + 데이터 목록으로 구성된 가장 기본적인 Search Page 샘플입니다.',
} as const;
```

`programKey`는 메뉴, 권한, 로그, 라이선스와 연결될 기준 키이다.

---

### 4.2 공통 버튼은 `COMMON_ACTIONS`를 사용

공통 버튼 코드는 페이지마다 직접 문자열로 작성하지 않고 `COMMON_ACTIONS`에서 import하여 사용한다.

```ts
import { COMMON_ACTIONS } from '../../../constants/actionCodes';
```

현재 정의된 공통 Action Code는 다음과 같다.

```ts
export const COMMON_ACTIONS = {
  SEARCH: 'SEARCH',
  RESET: 'RESET',
  CREATE: 'CREATE',
  SAVE: 'SAVE',
  DELETE: 'DELETE',
  EXCEL_DOWNLOAD: 'EXCEL_DOWNLOAD',
  PRINT: 'PRINT',
} as const;
```

향후 버튼 권한, 로그, 라이선스 체크는 `programKey + actionCode` 조합으로 연결한다.

---

### 4.3 검색조건은 화면 상태이므로 camelCase 사용

검색조건 타입은 React 화면 상태값이므로 camelCase를 사용한다.

```ts
type SearchCondition = {
  sampleName: string;
  sampleType: string;
  useYn: string;
};
```

반면 row 데이터 필드는 DB/API 응답 구조를 가정하여 SNAKE_UPPER를 사용한다.

```ts
SAMPLE_ID
SAMPLE_NAME
SAMPLE_TYPE
USE_YN
CREATED_AT
```

---

### 4.4 서버 검색조건과 그리드 필터는 분리

현재 `searchMockRows`는 DB/API 연동 전 mock 데이터를 조회하기 위한 임시 함수이다.

```ts
function searchMockRows(
  rows: SearchSampleType1Row[],
  condition: SearchCondition,
): SearchSampleType1Row[] {
  // mock 조회 처리
}
```

이 함수는 그리드 필터 기능이 아니다.

구분 기준은 다음과 같다.

| 구분 | 역할 |
| --- | --- |
| 검색조건 | 서버 조회 조건. 업무적으로 의미 있는 조건만 배치 |
| 그리드 필터 | 조회된 결과 안에서 사용자가 임시로 필터링하는 기능 |

실제 API 연동 후에는 `searchMockRows`를 service 호출로 대체한다.

```ts
const result = await searchSampleType1(condition);
```

---

## 5. 화면 구성 순서

`SearchSampleType1Page.tsx`는 다음 순서로 작성한다.

```text
1. import
2. PAGE_CONFIG
3. SearchCondition 타입
4. initialCondition
5. columns
6. searchMockRows
7. SearchSampleType1Page 컴포넌트
8. condition / searchedCondition 상태
9. searchedRows 계산
10. updateCondition
11. handleSearch
12. handleReset
13. PageHeader
14. SearchPanel
15. DataTable
```

이 순서를 유지하면 신규 개발자가 기존 화면을 복사해 새 화면으로 변환하기 쉽다.

---

## 6. 메뉴 및 프로그램 연결

샘플 화면은 `adminPrograms.ts`에 프로그램과 메뉴로 등록한다.

### programs

```ts
{
  programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
  programName: '기본 검색 페이지 샘플 Type 1',
  componentName: 'SearchSampleType1Page',
  screenType: 'GRID_DETAIL',
  routePath: '/dev-guide/search-sample-type-1',
  actions: ['SEARCH'],
  manualActions: ['MANUAL_VIEW'],
}
```

### menus

```ts
{
  menuKey: 'DEV_GUIDE.SEARCH_SAMPLE_TYPE_1',
  parentMenuKey: 'DEV_GUIDE',
  menuName: '기본 검색 페이지 샘플',
  menuLevel: 2,
  menuType: 'SCREEN',
  programKey: 'DEV_SEARCH_SAMPLE_TYPE_1',
  sortOrder: 1,
  useYn: 'Y',
}
```

현재 메뉴는 코드 상수로 관리하지만, 추후 DB/API 조회 결과로 대체할 수 있다.

---

## 7. 현재 한계와 다음 리팩토링 후보

이번 샘플을 통해 확인된 다음 개선 후보는 다음과 같다.

### 7.1 programRegistry 분리

현재 `AppLayout.tsx`에서 화면 컴포넌트를 직접 import하고 `programComponents`에 매핑한다.

화면 수가 늘어나면 다음 구조로 분리한다.

```text
src/config/programRegistry.tsx
```

역할:

```text
PROGRAM_KEY → 실제 React Page 컴포넌트
```

---

### 7.2 PageHeader / SearchPanel actions 표준화

현재 공통 컴포넌트는 `actions`를 `ReactNode`로 받는다.

향후에는 다음처럼 Action Config 배열을 받는 구조로 확장한다.

```ts
actions={[
  {
    actionCode: COMMON_ACTIONS.SEARCH,
    onClick: handleSearch,
  },
]}
```

이렇게 해야 버튼 라벨, 권한, 로그, 라이선스 체크를 공통 컴포넌트에서 통제할 수 있다.

---

### 7.3 DataTable 설정 간소화

현재 `DataTable`은 컬럼마다 `render` 함수를 요구한다.

향후 단순 필드 출력은 더 간단히 작성할 수 있는 helper를 검토한다.

예상 방향:

```ts
createTextColumn('SAMPLE_ID', '샘플 ID')
```

---

### 7.4 devGuide 메뉴 노출 제어

`devGuide` 메뉴는 개발자 표준 샘플 영역이므로 운영 배포 시 노출 여부를 제어해야 한다.

후보 방식:

```ts
import.meta.env.DEV
```

또는 별도 환경변수:

```text
VITE_SHOW_DEV_GUIDE=true
```

---

## 8. 신규 화면 복사 기준

신규 검색 화면을 만들 때는 다음 순서로 복사/수정한다.

```text
1. searchSampleType1 폴더 복사
2. 폴더명 변경
3. Page 컴포넌트명 변경
4. Row 타입 변경
5. mock 데이터 변경
6. PAGE_CONFIG 변경
7. SearchCondition 변경
8. columns 변경
9. searchMockRows 조건 변경
10. adminPrograms.ts에 program/menu 등록
11. AppLayout 또는 programRegistry에 컴포넌트 연결
12. npm run build 확인
```

---

## 9. 오늘 기준 완료 상태

* devGuide 메뉴에서 기본 검색 페이지 샘플 접근 가능
* 검색조건 입력 가능
* 조회 버튼으로 mock 데이터 조건 조회 가능
* 초기화 버튼으로 검색조건 및 조회 결과 초기화 가능
* DataTable에 조회 결과 표시 가능
* 공통 Action Code 사용 기준 마련
* 공통 컴포넌트 index 사용 기준 마련

이 화면은 향후 BaseKit 개발자 교육용 Search Page Type 1 표준 샘플로 사용한다.
