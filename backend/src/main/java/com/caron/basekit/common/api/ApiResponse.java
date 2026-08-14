package com.caron.basekit.common.api;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record ApiResponse<T>(boolean SUCCESS, T DATA, OffsetDateTime RESPONSE_AT) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, OffsetDateTime.now(ZoneOffset.UTC));
    }
}
