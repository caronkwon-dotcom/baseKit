package com.caron.basekit.standarddesign.llm;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "standard-design.llm")
public record LlmProperties(
        boolean enabled,
        String baseUrl,
        String apiKey,
        String model,
        String chatCompletionsPath
) {
}
