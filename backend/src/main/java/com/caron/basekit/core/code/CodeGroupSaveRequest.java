package com.caron.basekit.core.code;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CodeGroupSaveRequest(
        @NotBlank @Size(max = 50) String CODE_GROUP_ID,
        @NotBlank @Size(max = 100) String CODE_GROUP_NAME,
        @Size(max = 500) String DESCRIPTION,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN
) {
}
