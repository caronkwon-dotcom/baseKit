package com.caron.basekit.standarddesign.terms;

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
import com.caron.basekit.standarddesign.llm.LlmConnectionException;

@RestController
@RequestMapping("/api/standard-design/terms/llm")
class StandardDesignTermLlmController {

    private final StandardDesignTermLlmService service;

    StandardDesignTermLlmController(StandardDesignTermLlmService service) {
        this.service = service;
    }

    @PostMapping("/recommend")
    ApiResponse<StandardDesignTermLlmResult> recommend(@Valid @RequestBody RecommendationRequest request) {
        return ApiResponse.success(service.recommend(request.question()));
    }

    @ExceptionHandler(LlmConnectionException.class)
    ResponseEntity<ErrorResponse> handleLlmConnection(LlmConnectionException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("COMPANY_LLM_UNAVAILABLE", exception.getMessage()));
    }

    record RecommendationRequest(@NotBlank(message = "질문을 입력해 주세요.") String question) {
    }
}
