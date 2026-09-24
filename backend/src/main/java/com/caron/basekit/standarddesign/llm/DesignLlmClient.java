package com.caron.basekit.standarddesign.llm;

public interface DesignLlmClient {

    LlmChatResult chat(String systemPrompt, String userPrompt);

    record LlmChatResult(String model, String content) {
    }
}
