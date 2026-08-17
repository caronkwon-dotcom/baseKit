# ADR 012. 표준용어 정제 Workbench와 JSON 저장 경계

## 상태

승인·구현 중

## 현재 구조

BaseKit은 DB 도입 전이며 `meta/terms.json`, `meta/domains.json`에 최소 샘플만 관리한다. 행정안전부 공공표준용어 8차 데이터는 13,176건으로, 원본 전체를 즉시 BaseKit 표준으로 적용하기에는 기존 명명 규칙과 충돌하고 폐기·변경 이력도 포함한다.

## 결정

- 공공표준 CSV는 수정하지 않는 참조 원본으로 보존한다.
- 정제 결과는 원본 전체 복제가 아니라 검토한 항목의 상태와 BaseKit 적용값만 `meta/term-curation.json`에 저장한다.
- 검토 상태는 미검토, 검토 중, 채택, 수정 채택, 보류, 제외로 구분한다.
- 로컬 Vite 개발환경에서는 개발 전용 API가 임시 파일 기록, JSON 재검증, 기존 파일 백업, 덮어쓰기, 결과 재검증 순서로 저장한다. Windows/OneDrive에서 기존 파일 대상 `rename`이 제한될 수 있으므로 백업 복구 방식을 사용한다.
- GitHub Pages는 정적 환경이므로 Repository 파일을 수정할 수 없다. 배포 화면에서는 브라우저 저장소에 임시 저장하고 JSON 내려받기를 제공한다.
- 향후 DB 도입 시 화면과 정제 모델을 유지하고 저장 Repository/Adapter만 교체한다.

## 원본과 채택 데이터

```text
public/data/common-standard-terms-20251101.csv  공공표준 원본·수정 금지
meta/term-curation.json                         검토 진행 및 정제 결과
meta/terms.json                                추후 승인된 BaseKit 표준 용어
meta/domains.json                              추후 승인된 BaseKit 표준 도메인
```

공공표준과 BaseKit 기존 명칭이 충돌하면 자동 덮어쓰기하지 않고 `공공표준 채택 / BaseKit 유지 / 별칭 등록` 중 하나를 검토한다.

## 후속 결정

- 채택 용어를 `terms.json`과 `domains.json`으로 승격하는 승인 절차
- 단어 사전과 용어 조합 규칙
- 물리명 중복, 금칙어, 도메인 적합성 검증 규칙
- JSON 동시 편집 충돌과 상세 변경 이력
- DB 저장 Adapter와 운영 권한
