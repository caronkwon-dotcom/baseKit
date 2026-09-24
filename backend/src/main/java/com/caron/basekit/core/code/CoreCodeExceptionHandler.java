package com.caron.basekit.core.code;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CoreCodeController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class CoreCodeExceptionHandler {

    @ExceptionHandler(CoreCodeNotFoundException.class)
    ResponseEntity<ErrorResponse> handleNotFound(CoreCodeNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("CORE_CODE_NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(CoreCodeConflictException.class)
    ResponseEntity<ErrorResponse> handleConflict(CoreCodeConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of("CORE_CODE_CONFLICT", exception.getMessage()));
    }
}
