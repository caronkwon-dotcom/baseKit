package com.caron.basekit.core.program;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = ProgramController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class ProgramExceptionHandler {
    @ExceptionHandler(ProgramNotFoundException.class) ResponseEntity<ErrorResponse> notFound(ProgramNotFoundException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of("CORE_PROGRAM_NOT_FOUND", e.getMessage())); }
    @ExceptionHandler(ProgramConflictException.class) ResponseEntity<ErrorResponse> conflict(ProgramConflictException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of("CORE_PROGRAM_CONFLICT", e.getMessage())); }
}
