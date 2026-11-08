package com.caron.basekit.core.documentnumber;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DocumentNumberController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class DocumentNumberExceptionHandler {
    @ExceptionHandler(DocumentNumberNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(DocumentNumberNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of("DOCUMENT_NUMBER_NOT_FOUND", exception.getMessage()));
    }
    @ExceptionHandler(DocumentNumberConflictException.class)
    ResponseEntity<ErrorResponse> conflict(DocumentNumberConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of("DOCUMENT_NUMBER_CONFLICT", exception.getMessage()));
    }
}
