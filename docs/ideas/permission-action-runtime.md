# Permission Action Runtime 연결

## Status

REVIEW

## 배경과 문제

현재 `ProgramDataGrid`는 Frontend Mock 메타데이터와 샘플 역할로 버튼 노출을 검증한다. 실제 서비스에서는 로그인 사용자 역할과 서버 권한을 기준으로 해야 한다.

## 아이디어 요약

- Login Context가 현재 역할과 사용 가능한 `PROGRAM × ACTION_CODE`를 제공한다.
- 공통 Action 영역은 Page에서 역할 코드를 직접 전달받지 않고 Context를 사용한다.
- Frontend 숨김은 UX 제어이며 Backend는 모든 Action API를 독립적으로 재검증한다.
- Action 정의에 표시 영역, 정렬 순서, 아이콘, 강조 수준, 다중 선택 필요 여부를 포함할지 검토한다.
- 미등록 함수가 있는 Action을 숨김·비활성·오류 중 어떻게 처리할지 정책화한다.

## 기대 효과

개발자가 버튼 배치와 권한 분기를 반복 구현하지 않고 Action 실행 로직만 작성할 수 있다.

## 위험 및 영향범위

메타데이터가 과도하게 UI 세부사항까지 담으면 이해가 어려워질 수 있다. 서버 권한과 Frontend 캐시 불일치 처리도 필요하다.

## 선행조건

Login Context, Backend 인증·인가 API, Action 실행 결과 표준이 필요하다.

## 결정이 필요한 사항

- 메타데이터가 관리할 UI 속성의 최대 범위
- 복수 역할 권한 병합 규칙
- 권한 변경의 Frontend 반영 시점과 캐시 정책

## 관련 문서

- `docs/decisions/007-program-action-permission-metadata.md`
- `docs/decisions/010-program-data-grid-and-actions.md`
