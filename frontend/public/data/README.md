# 공공표준용어 원본 데이터

- 파일: `common-standard-terms-20251101.csv`
- 출처: 행정안전부 공공데이터 공통표준용어 8차(2025-11)
- 원본 페이지: <https://www.data.go.kr/data/15156379/fileData.do?recommendDataYn=Y>
- 이용 조건: 이용 제한 없음

이 파일은 정제 기준이 되는 원본이므로 직접 수정하지 않는다. BaseKit 정제 결과는 `meta/term-curation.json`에 별도로 저장한다.

- `common-standard-words-20251101.csv`: 행정안전부 공통표준단어 3,284건
- `common-standard-domains-20251101.csv`: 행정안전부 공통표준도메인 129건
- `term-word-decomposition-20251101.json`: 공식 단어 약어 기준 용어 13,176건 분리 결과

공식 단어는 `meta/words.json`으로 가져오되 자동 검수완료하지 않는다. `scripts/import-standard-words.mjs`가 원본 반입과 용어 분리 결과를 재생성한다.

- 공식 단어 출처: <https://www.data.go.kr/data/15156439/fileData.do>
- 공식 도메인 출처: <https://www.data.go.kr/data/15156442/fileData.do>
