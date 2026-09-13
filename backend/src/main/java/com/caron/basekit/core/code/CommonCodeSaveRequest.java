package com.caron.basekit.core.code;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record CommonCodeSaveRequest(
        @NotBlank @Size(max = 50) String CODE_ID,
        @NotBlank @Size(max = 50) String CODE_GROUP_ID,
        @NotBlank @Size(max = 50) String CODE,
        @NotBlank @Size(max = 100) String CODE_NAME,
        @NotNull @Min(0) Integer SORT_ORDER,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN,
        Map<String, String> ATTRIBUTE_VALUES
) {
    public CommonCodeSaveRequest(String CODE_ID, String CODE_GROUP_ID, String CODE, String CODE_NAME,
                                 Integer SORT_ORDER, String USE_YN) {
        this(CODE_ID, CODE_GROUP_ID, CODE, CODE_NAME, SORT_ORDER, USE_YN, null);
    }
}
