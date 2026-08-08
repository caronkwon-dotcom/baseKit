# 009. Search Panel Layout and Feature Structure

## 상태

Accepted

## 배경

검색조건과 초기화·조회 버튼이 서로 다른 줄에 배치되면 조건이 적은 화면에서도 불필요한 세로 공간을 사용한다. 또한 검색 샘플 Page 한 파일에 타입, 설정, 컬럼과 Mock 조회가 함께 있으면 신규 개발자가 화면을 복사할 때 수정 경계가 불명확해진다.

## 결정

### 검색영역

- Desktop은 `검색조건 4열 + 우측 Action 영역`을 기본으로 한다.
- Action 영역은 검색조건과 같은 Layout 안에서 마지막 검색 단의 오른쪽에 배치한다.
- `SearchPanel.rows`는 `1 | 2 | 3`만 허용한다.
- 조건 상한은 1단 4개, 2단 8개, 3단 12개다.
- 상한을 넘으면 공통 컴포넌트가 오류를 발생시킨다.
- 작은 화면에서는 조건과 Action을 한 열로 전환한다.

### Feature 파일 책임

검색형 Feature는 다음 책임을 기준으로 분리한다.

```text
types       검색조건과 데이터 계약
config      Page Context, 검색 단수, 초기값, Grid 컬럼
mock        API 연결 전 원본 데이터
repository  조회와 향후 REST Adapter 교체 경계
page        상태, 이벤트, 공통 컴포넌트 조립
index       외부 공개 범위
```

Mock과 Repository 구현은 Feature 내부에 두고 외부에는 Page와 필요한 공개 타입만 노출한다.

## 영향

- 검색조건이 한 단에 들어오면 버튼도 같은 줄에 유지된다.
- 2~3단 화면도 같은 공통 Layout을 사용한다.
- 신규 개발자는 파일별 책임에 따라 제한된 영역만 수정한다.
- REST 연결 시 Page가 Mock 데이터에 직접 의존하지 않는다.

## 후속 대상

- 비동기 Repository의 loading/error 계약
- Action Config 기반 권한·로그 연결
- 날짜범위 등 복합 검색필드의 열 너비 정책
