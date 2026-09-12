package com.caron.basekit.standarddesign.llm;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Component
class CompanyLlmClient implements DesignLlmClient {

    private final RestClient.Builder restClientBuilder;
    private final LlmProperties properties;

    CompanyLlmClient(RestClient.Builder restClientBuilder, LlmProperties properties) {
        this.restClientBuilder = restClientBuilder;
        this.properties = properties;
    }

    @Override
    public LlmChatResult chat(String systemPrompt, String userPrompt) {
        validateConfiguration();
        String endpoint = properties.baseUrl().replaceAll("/+$", "")
                + "/" + properties.chatCompletionsPath().replaceAll("^/+", "");
        ChatCompletionRequest request = new ChatCompletionRequest(
                properties.model(),
                List.of(new Message("system", systemPrompt), new Message("user", userPrompt)),
                0.7
        );

        try {
            ChatCompletionResponse response = restClientBuilder.build()
                    .post()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .body(request)
                    .retrieve()
                    .body(ChatCompletionResponse.class);
            if (response == null || response.choices() == null || response.choices().isEmpty()
                    || response.choices().getFirst().message() == null
                    || !StringUtils.hasText(response.choices().getFirst().message().content())) {
                throw new LlmConnectionException("회사 LLM 응답 내용이 비어 있습니다.");
            }
            return new LlmChatResult(properties.model(), response.choices().getFirst().message().content());
        } catch (LlmConnectionException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new LlmConnectionException("회사 LLM 연결에 실패했습니다.");
        }
    }

    private void validateConfiguration() {
        if (!properties.enabled()) {
            throw new LlmConnectionException("회사 LLM 연동이 비활성화되어 있습니다.");
        }
        if (!StringUtils.hasText(properties.baseUrl()) || !StringUtils.hasText(properties.apiKey())) {
            throw new LlmConnectionException("회사 LLM 연결 설정이 완료되지 않았습니다.");
        }
    }

    private record Message(String role, String content) {
    }

    private record ChatCompletionRequest(String model, List<Message> messages, double temperature) {
    }

    private record ChatCompletionResponse(List<Choice> choices) {
    }

    private record Choice(Message message) {
    }
}
