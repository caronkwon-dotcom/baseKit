package com.caron.basekit.standarddesign.projectmenu;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.NoSuchElementException;

@RestControllerAdvice(assignableTypes = ProjectMenuController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class ProjectMenuExceptionHandler {
    @ExceptionHandler(NoSuchElementException.class) ResponseEntity<ErrorResponse> missing(NoSuchElementException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of("PROJECT_MENU_NOT_FOUND", e.getMessage())); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ErrorResponse> bad(IllegalArgumentException e) { return ResponseEntity.badRequest().body(ErrorResponse.of("PROJECT_MENU_INVALID", e.getMessage())); }
    @ExceptionHandler(IllegalStateException.class) ResponseEntity<ErrorResponse> conflict(IllegalStateException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of("PROJECT_MENU_CONFLICT", e.getMessage())); }
}
