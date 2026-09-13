package com.caron.basekit.core.program;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProgramSaveRequest(
        @NotBlank @Size(max = 50) String PROGRAM_ID,
        @NotBlank @Size(max = 100) String PROGRAM_KEY,
        @NotBlank @Size(max = 100) String PROGRAM_NAME,
        @NotBlank @Size(max = 50) String MODULE_CODE,
        @NotBlank @Size(max = 50) String PROGRAM_TYPE_CODE,
        @NotBlank @Size(max = 255) String ROUTE,
        @Size(max = 500) String DESCRIPTION,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN) {
}
