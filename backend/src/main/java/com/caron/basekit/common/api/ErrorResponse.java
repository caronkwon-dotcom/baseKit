package com.caron.basekit.common.api;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

public record ErrorResponse(
        boolean SUCCESS,
        String ERROR_CODE,
        String MESSAGE,
        List<FieldError> FIELD_ERRORS,
        OffsetDateTime RESPONSE_AT
) {
    public static ErrorResponse of(String errorCode, String message) {
        return new ErrorResponse(false, errorCode, message, List.of(), OffsetDateTime.now(ZoneOffset.UTC));
    }

    public static ErrorResponse validation(List<FieldError> fieldErrors) {
        return new ErrorResponse(false, "VALIDATION_ERROR", "입력값을 확인해 주세요.", fieldErrors,
                OffsetDateTime.now(ZoneOffset.UTC));
    }

    public record FieldError(String FIELD_NAME, String MESSAGE) {
    }
}
