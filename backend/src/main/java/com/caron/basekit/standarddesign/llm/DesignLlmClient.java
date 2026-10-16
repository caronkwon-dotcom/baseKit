package com.caron.basekit.standarddesign.llm;

public interface DesignLlmClient {
    LlmChatResult chat(String systemPrompt, String userPrompt);
    default LlmChatResult chatRaw(String systemPrompt, String userPrompt) { return chat(systemPrompt, userPrompt); }
    default LlmChatResult chatRaw(String systemPrompt, String userPrompt, LlmChatOptions options) {
        return chatRaw(systemPrompt, userPrompt);
    }
    record LlmChatOptions(Integer maxTokens, Double temperature, Boolean enableThinking, Integer timeoutSeconds) { }
    record LlmChatResult(String model, String content, int httpStatus) {
        public LlmChatResult(String model, String content) { this(model, content, 200); }
    }
}
