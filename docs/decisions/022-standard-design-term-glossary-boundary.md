# ADR-022: Standard Design 용어집 조회 경계

- 상태: Accepted
- 범위: Standard Design Product Module의 read-only 표준용어집 조회

## 결정

`frontend/public/data/common-standard-terms-20251101.csv`를 원본으로 사용하고, Standard Design Backend가 UTF-8 BOM, 인용 쉼표, escaped quote, 줄바꿈을 지원하는 CSV Adapter로 읽는다. 데이터베이스 테이블과 migration은 추가하지 않는다.

Backend API는 `GET /api/standard-design/terms?keyword=&page=1&size=50` 및 `GET /api/standard-design/terms/{termId}`를 제공한다. 검색은 용어명/영문약어의 exact, prefix, 나머지 지정 검색 필드의 partial 순으로 정렬하며 source row 순서를 tie-break로 사용한다. 식별자는 헤더 다음 데이터 행 기준 `TERM-000001` 형식이다.

Frontend 프로그램 `SD_TERM_GLOSSARY`는 검색, 목록, 상세만 제공하고 프로그램/메뉴/권한 등록은 Standard Design manifest 내부에서만 수행한다. Core registry와 원본 CSV는 수정하지 않는다.

## 결과

원본 행 순서가 바뀌면 ID가 바뀔 수 있으므로 source 파일 교체 시 이 제약을 검토한다. 운영 경로는 `STANDARD_DESIGN_TERMS_CSV_PATH`로 재정의할 수 있다.
