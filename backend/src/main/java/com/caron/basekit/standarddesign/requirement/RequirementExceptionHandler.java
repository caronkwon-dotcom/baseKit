package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.io.IOException;
import java.util.NoSuchElementException;

@RestControllerAdvice(assignableTypes=RequirementController.class) @Order(Ordered.HIGHEST_PRECEDENCE)
class RequirementExceptionHandler {
    @ExceptionHandler(NoSuchElementException.class) ResponseEntity<ErrorResponse> missing(NoSuchElementException e) { return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.of("REQUIREMENT_NOT_FOUND",e.getMessage())); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ErrorResponse> bad(IllegalArgumentException e) { return ResponseEntity.badRequest().body(ErrorResponse.of("REQUIREMENT_INVALID",e.getMessage())); }
    @ExceptionHandler(HttpMessageNotReadableException.class) ResponseEntity<ErrorResponse> malformed(HttpMessageNotReadableException e) { return ResponseEntity.badRequest().body(ErrorResponse.of("REQUIREMENT_INVALID","요청 형식을 확인해 주세요.")); }
    @ExceptionHandler(IOException.class) ResponseEntity<ErrorResponse> io(IOException e) { return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.of("ATTACHMENT_IO_ERROR","첨부파일 처리에 실패했습니다.")); }
}
