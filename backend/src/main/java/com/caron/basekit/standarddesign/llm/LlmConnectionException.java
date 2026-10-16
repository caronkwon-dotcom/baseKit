package com.caron.basekit.standarddesign.llm;

public class LlmConnectionException extends RuntimeException {
    public enum Failure { CONFIGURATION, HTTP, TIMEOUT, NETWORK, EMPTY_RESPONSE, RESPONSE_FORMAT, UNKNOWN }
    private final Failure failure;
    private final Integer httpStatus;
    public LlmConnectionException(String message) { this(Failure.UNKNOWN, null, message); }
    public LlmConnectionException(Failure failure, Integer httpStatus, String message) {
        super(message); this.failure = failure; this.httpStatus = httpStatus;
    }
    public Failure failure() { return failure; }
    public String diagnosticMessage() {
        return switch (failure) {
            case CONFIGURATION -> "LLM 설정이 없거나 연동이 비활성화되어 있습니다.";
            case HTTP -> "LLM 서버가 요청을 거부했습니다. (HTTP " + httpStatus + ")";
            case TIMEOUT -> "LLM 응답 대기 시간이 초과되었습니다.";
            case NETWORK -> "LLM 서버 통신에 실패했습니다. DNS·TLS·네트워크 연결을 확인하세요.";
            case EMPTY_RESPONSE -> "LLM 응답에 분석 결과 content가 없습니다.";
            case RESPONSE_FORMAT -> "LLM 응답 형식을 읽지 못했습니다.";
            case UNKNOWN -> "LLM 호출에 실패했습니다. 연결 설정 및 제공자 상태를 확인하세요.";
        };
    }
}
