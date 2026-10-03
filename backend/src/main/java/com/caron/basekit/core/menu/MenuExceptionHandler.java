package com.caron.basekit.core.menu;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = MenuController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class MenuExceptionHandler {
    @ExceptionHandler(MenuNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(MenuNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("CORE_MENU_NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(MenuConflictException.class)
    ResponseEntity<ErrorResponse> conflict(MenuConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of("CORE_MENU_CONFLICT", exception.getMessage()));
    }
}
