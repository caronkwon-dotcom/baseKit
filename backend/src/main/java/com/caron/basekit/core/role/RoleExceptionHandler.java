package com.caron.basekit.core.role;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = RoleController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class RoleExceptionHandler {
    @ExceptionHandler(RoleNotFoundException.class) ResponseEntity<ErrorResponse> notFound(RoleNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of("CORE_ROLE_NOT_FOUND", e.getMessage())); }
    @ExceptionHandler(RoleConflictException.class) ResponseEntity<ErrorResponse> conflict(RoleConflictException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of("CORE_ROLE_CONFLICT", e.getMessage())); }
}