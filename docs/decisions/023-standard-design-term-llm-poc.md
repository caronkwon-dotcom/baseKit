# ADR-023: Standard Design LLM 표준용어 추천 PoC

- 상태: PoC
- 범위: Standard Design 내부의 조회 보조 기능

자연어 질문은 기존 Company LLM 경계를 통해 두 단계로 처리한다. 1차 응답은 의도와 최대 5개 검색어만 구조화하고, Backend `StandardDesignTermService`가 원문 질문과 재구성 검색어로 CSV를 조회한다. 2차 LLM에는 최대 20개의 실제 CSV 후보 요약만 전달한다.

추천 ID는 후보 목록에 포함되어 있어야 하며, 최종적으로 `StandardDesignTermService.get()`으로 원본 상세 존재를 재검증한다. 후보 밖 ID, 생성된 용어, CSV 전체 데이터는 성공 결과로 허용하지 않는다. 후보가 없거나 확정할 수 없으면 `recommendedTermId=null`과 명시적 미검색 답변을 반환한다.

이번 PoC는 Column mapping, DB migration, embedding/vector/RAG, word composition, 신규 용어 요청과 AI 승인 workflow를 포함하지 않는다.
