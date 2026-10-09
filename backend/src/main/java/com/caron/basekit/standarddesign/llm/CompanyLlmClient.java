package com.caron.basekit.standarddesign.llm;

import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.net.SocketTimeoutException;
import org.springframework.web.client.ResourceAccessException;
import static com.caron.basekit.standarddesign.llm.LlmConnectionException.Failure.*;

@Component
class CompanyLlmClient implements DesignLlmClient {

    private static final Logger log = LoggerFactory.getLogger(CompanyLlmClient.class);
    private final LlmProperties properties;

    CompanyLlmClient(LlmProperties properties) {
        this.properties = properties;
    }

    @Override
    public LlmChatResult chat(String systemPrompt, String userPrompt) {
        var raw = chatRaw(systemPrompt, userPrompt);
        if (raw.httpStatus() < 200 || raw.httpStatus() >= 300) throw new LlmConnectionException(HTTP, raw.httpStatus(), "회사 LLM 요청 거부");
        try {
            var envelope = new com.fasterxml.jackson.databind.ObjectMapper().readTree(raw.content());
            var content = envelope.path("choices").path(0).path("message").path("content");
            if (!content.isTextual() || !StringUtils.hasText(content.asText())) throw new LlmConnectionException(EMPTY_RESPONSE, null, "회사 LLM 응답 내용이 비어 있습니다.");
            return new LlmChatResult(raw.model(), content.asText());
        } catch (LlmConnectionException e) { throw e; }
        catch (Exception e) { throw new LlmConnectionException(RESPONSE_FORMAT, null, "회사 LLM 응답 형식 처리에 실패했습니다."); }
    }

    @Override
    public LlmChatResult chatRaw(String systemPrompt, String userPrompt) {
        return chatRaw(systemPrompt, userPrompt, new LlmChatOptions(null, 0.7, null, 300));
    }

    @Override
    public LlmChatResult chatRaw(String systemPrompt, String userPrompt, LlmChatOptions options) {
        validateConfiguration();
        String endpoint = properties.baseUrl().replaceAll("/+$", "")
                + "/" + properties.chatCompletionsPath().replaceAll("^/+", "");
        var request = new java.util.LinkedHashMap<String, Object>();
        request.put("model", properties.model());
        request.put("messages", List.of(new Message("system", systemPrompt), new Message("user", userPrompt)));
        request.put("temperature", options.temperature() == null ? 0.7 : options.temperature());
        if (options.maxTokens() != null) request.put("max_tokens", options.maxTokens());
        if (options.enableThinking() != null) request.put("chat_template_kwargs", java.util.Map.of("enable_thinking", options.enableThinking()));
        long startedAt = System.nanoTime();
        log.info("company-llm HTTP request start systemPromptBytes={} userPromptBytes={} inputTokens=unavailable firstResponseByte=unavailable",
                utf8Length(systemPrompt), utf8Length(userPrompt));

        try {
            JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                    java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(10)).build());
            factory.setReadTimeout(java.time.Duration.ofSeconds(options.timeoutSeconds() == null ? 300 : options.timeoutSeconds()));
            var response = RestClient.builder()
                    .requestFactory(factory)
                    .build()
                    .post()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .body(request)
                    .retrieve()
                    .onStatus(status -> status.isError(), (requestInfo, responseInfo) -> { })
                    .toEntity(String.class);
            String raw = response.getBody() == null ? "" : response.getBody();
            log.info("company-llm HTTP response complete responseCompleteElapsedMs={} outputBytes={} httpStatus={}",
                    elapsedMillis(startedAt), utf8Length(raw), response.getStatusCode().value());
            return new LlmChatResult(properties.model(), raw, response.getStatusCode().value());
        } catch (LlmConnectionException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw new LlmConnectionException(
                    HTTP, exception.getStatusCode().value(), "회사 LLM이 요청을 거부했습니다. (HTTP " + exception.getStatusCode().value() + ")"
            );
        } catch (ResourceAccessException exception) {
            Throwable cause = exception;
            boolean timedOut = false;
            for (int depth = 0; cause != null && depth < 20; depth++, cause = cause.getCause()) {
                if (cause instanceof SocketTimeoutException || cause instanceof java.net.http.HttpTimeoutException) timedOut = true;
            }
            throw new LlmConnectionException(timedOut ? TIMEOUT : NETWORK, null, "회사 LLM 통신에 실패했습니다.");
        } catch (RestClientException exception) {
            throw new LlmConnectionException(RESPONSE_FORMAT, null, "회사 LLM 응답 형식 처리에 실패했습니다.");
        } catch (IllegalArgumentException exception) {
            throw new LlmConnectionException(CONFIGURATION, null, "회사 LLM 연결 설정 형식을 확인해 주세요.");
        } catch (RuntimeException exception) {
            throw new LlmConnectionException(RESPONSE_FORMAT, null, "회사 LLM 응답 처리에 실패했습니다.");
        }

    }

    private int utf8Length(String value) {
        return value == null ? 0 : value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private void validateConfiguration() {
        if (!properties.enabled()) {
            throw new LlmConnectionException(CONFIGURATION, null, "회사 LLM 연동이 비활성화되어 있습니다.");
        }
        if (!StringUtils.hasText(properties.baseUrl()) || !StringUtils.hasText(properties.apiKey())
                || !StringUtils.hasText(properties.model()) || !StringUtils.hasText(properties.chatCompletionsPath())) {
            throw new LlmConnectionException(CONFIGURATION, null, "회사 LLM 연결 설정이 완료되지 않았습니다.");
        }
    }

    private record Message(String role, String content) {
    }


}

