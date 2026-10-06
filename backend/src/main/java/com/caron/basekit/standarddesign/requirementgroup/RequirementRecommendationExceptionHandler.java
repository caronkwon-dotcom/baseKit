package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice(assignableTypes = {RequirementRecommendationController.class, RequirementGroupController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequirementRecommendationExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorResponse> domain(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ErrorResponse.of("RECOMMENDATION_INVALID", e.getReason()));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> malformed(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(ErrorResponse.of("RECOMMENDATION_INVALID", "요청 형식을 확인하세요."));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException e) {
        return ResponseEntity.status(409).body(ErrorResponse.of("RECOMMENDATION_CONFLICT", "참조 또는 요청이 변경되었습니다. REQUEST_ID로 저장 결과를 조회하세요."));
    }
}
