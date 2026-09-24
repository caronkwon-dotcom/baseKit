# ADR-021 Standard Design 회사 LLM 연동 경계

## Status

ACCEPTED

## 배경

Standard Design은 BaseKit을 적용하는 첫 Product Module이며 화면·DB 설계를 LLM으로 검증할 가능성이 있다. 회사 LLM은 OpenAI 호환 API를 제공하지만 URL과 인증키는 배포환경마다 다르며 Browser에 노출되어서는 안 된다.

## 결정

- Frontend는 회사 LLM을 직접 호출하지 않고 BaseKit Spring API만 호출한다.
- Backend의 `DesignLlmClient`를 Port로, `CompanyLlmClient`를 OpenAI 호환 Adapter로 둔다.
- 연결 설정은 `COMPANY_LLM_*` 환경변수로만 주입하고 실제 값은 Repository에 저장하지 않는다.
- Base URL과 Chat Completions Path를 분리하여 `/v1` 포함 여부에 대응한다.
- 설정이 없거나 연동이 비활성화되어도 Application Context는 정상 기동한다.
- 외부 응답 오류에는 URL, 인증 Header, Key와 원문 예외를 노출하지 않는다.
- 1차 UI는 `화면 설계`의 연결 점검에만 두며 `SD_DESIGN_VALIDATE` 업무 권한과 결합하지 않는다.
- 자동 테스트는 `DesignLlmClient`를 Mock 처리하고 실제 회사 LLM을 호출하지 않는다.

## 현재 범위

- `POST /api/standard-design/v1/llm/test`
- `POST /api/standard-design/v1/llm/prompt`
- System Prompt와 사용자 메시지 1건 전송
- `choices[0].message.content` 반환
- 화면 설계의 별도 연결 확인과 저장 없는 단일 Prompt UI

## 제외 범위

Screen Design Schema, 실제 설계 검증 Prompt, Structured Output, 저장, 대화이력, Streaming, RAG, Multi Model과 사용량 Dashboard는 후속 작업이다.
