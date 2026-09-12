package com.caron.basekit.standarddesign.terms;

import com.caron.basekit.common.api.ApiResponse;
import com.caron.basekit.common.api.ErrorResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.caron.basekit.standarddesign.llm.LlmConnectionException;
import java.util.UUID;

@RestController
@RequestMapping("/api/standard-design/terms/llm")
class StandardDesignTermLlmController {

    private static final Logger log = LoggerFactory.getLogger(StandardDesignTermLlmController.class);
    private final StandardDesignTermLlmService service;

    StandardDesignTermLlmController(StandardDesignTermLlmService service) {
        this.service = service;
    }

    @PostMapping("/recommend")
    ApiResponse<StandardDesignTermLlmResult> recommend(@Valid @RequestBody RecommendationRequest request) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        long startedAt = System.nanoTime();
        log.info("standard-term-llm HTTP request start requestId={}", requestId);
        try {
            StandardDesignTermLlmResult result = service.recommend(request.question(), requestId);
            log.info("standard-term-llm HTTP request end requestId={} elapsedMs={} candidateCount={} recommendedTermId={}",
                    requestId, elapsedMillis(startedAt), result.candidates().size(),
                    result.recommendedTermId() == null ? "NONE" : result.recommendedTermId());
            return ApiResponse.success(result);
        } catch (RuntimeException exception) {
            log.info("standard-term-llm HTTP request end requestId={} elapsedMs={} outcome=ERROR",
                    requestId, elapsedMillis(startedAt));
            throw exception;
        }
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    @ExceptionHandler(LlmConnectionException.class)
    ResponseEntity<ErrorResponse> handleLlmConnection(LlmConnectionException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ErrorResponse.of("COMPANY_LLM_UNAVAILABLE", exception.getMessage()));
    }

    record RecommendationRequest(@NotBlank(message = "질문을 입력해 주세요.") String question) {
    }
}
