package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = RequirementTraceController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequirementTraceExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorResponse> domain(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ErrorResponse.of("REQUIREMENT_TRACE_INVALID", e.getReason()));
    }
}
