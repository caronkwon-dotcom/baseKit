package com.caron.basekit.core.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RoleSaveRequest(
        @NotBlank @Size(max = 50) String ROLE_ID,
        @NotBlank @Size(max = 100) String ROLE_CODE,
        @NotBlank @Size(max = 100) String ROLE_NAME,
        @Size(max = 500) String DESCRIPTION,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN) {
}