package com.caron.basekit.standarddesign.analysis;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AnalysisController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class AnalysisExceptionHandler {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AnalysisExceptionHandler.class);

    @ExceptionHandler(RuntimeException.class)
    ResponseEntity<ErrorResponse> unexpected(RuntimeException e) {
        log.error("analysis request failed", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.of("ANALYSIS_ERROR", "분석 처리 중 오류가 발생했습니다."));
    }

    @ExceptionHandler(AnalysisException.class)
    ResponseEntity<ErrorResponse> analysis(AnalysisException e) {
        return ResponseEntity.status(e.status()).body(ErrorResponse.of(e.code(), e.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> malformed(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of("ANALYSIS_INVALID", "요청 형식을 확인해 주세요."));
    }
}
