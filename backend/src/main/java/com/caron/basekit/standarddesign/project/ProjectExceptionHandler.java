package com.caron.basekit.standarddesign.project;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes = ProjectController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class ProjectExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class)
 ResponseEntity<ErrorResponse> domain(ResponseStatusException e) {
  return ResponseEntity.status(e.getStatusCode()).body(ErrorResponse.of("PROJECT_INVALID", e.getReason()));
 }
 @ExceptionHandler(HttpMessageNotReadableException.class)
 ResponseEntity<ErrorResponse> malformed(HttpMessageNotReadableException e) {
  return ResponseEntity.badRequest().body(ErrorResponse.of("PROJECT_INVALID", "요청 형식을 확인하세요."));
 }
}
