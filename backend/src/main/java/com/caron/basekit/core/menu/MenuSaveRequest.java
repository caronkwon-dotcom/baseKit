package com.caron.basekit.core.menu;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MenuSaveRequest(
        @NotBlank @Size(max = 100) String MENU_KEY,
        @NotBlank @Size(max = 100) String MENU_NAME,
        @Size(max = 100) String PARENT_MENU_KEY,
        @NotBlank @Size(max = 50) String MENU_TYPE_CODE,
        @NotNull @Min(0) Integer SORT_ORDER,
        @Size(max = 100) String PROGRAM_KEY,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN) {
}
