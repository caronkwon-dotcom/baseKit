package com.caron.basekit.standarddesign.llm;

import com.caron.basekit.common.api.ApiResponse;
import com.caron.basekit.common.api.ErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/standard-design/v1/llm")
class StandardDesignLlmController {

    private static final String SYSTEM_PROMPT = "You are a helpful assistant.";
    private final DesignLlmClient llmClient;

    StandardDesignLlmController(DesignLlmClient llmClient) {
        this.llmClient = llmClient;
    }

    @PostMapping("/test")
    ApiResponse<LlmTestResponse> test(@Valid @RequestBody LlmTestRequest request) {
        DesignLlmClient.LlmChatResult result = llmClient.chat(SYSTEM_PROMPT, request.MESSAGE());
        return ApiResponse.success(new LlmTestResponse(result.model(), result.content()));
    }

    @ExceptionHandler(LlmConnectionException.class)
    ResponseEntity<ErrorResponse> handleLlmConnection(LlmConnectionException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("COMPANY_LLM_UNAVAILABLE", exception.getMessage()));
    }

    record LlmTestRequest(@NotBlank(message = "메시지를 입력해 주세요.") String MESSAGE) {
    }

    record LlmTestResponse(String MODEL, String CONTENT) {
    }
}
