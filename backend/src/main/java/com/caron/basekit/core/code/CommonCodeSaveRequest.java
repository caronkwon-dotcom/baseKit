package com.caron.basekit.core.code;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CommonCodeSaveRequest(
        @NotBlank @Size(max = 50) String CODE_ID,
        @NotBlank @Size(max = 50) String CODE_GROUP_ID,
        @NotBlank @Size(max = 50) String CODE,
        @NotBlank @Size(max = 100) String CODE_NAME,
        @NotNull @Min(0) Integer SORT_ORDER,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN
) {
}
