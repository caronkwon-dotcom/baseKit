package com.caron.basekit.core.code;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CodeAttributeDefinitionSaveRequest(
        @NotBlank @Size(max = 50) String ATTRIBUTE_CODE,
        @NotBlank @Size(max = 100) String ATTRIBUTE_NAME,
        @NotBlank @Pattern(regexp = "STRING|NUMBER|BOOLEAN|DATE|DATETIME") String DATA_TYPE,
        @NotBlank @Pattern(regexp = "TEXT|NUMBER|SWITCH|SELECT|DATE_PICKER|COLOR_PICKER") String CONTROL_TYPE,
        @NotBlank @Pattern(regexp = "TEXT|NUMBER|BOOLEAN|DATE|DATETIME|COLOR|BADGE") String DISPLAY_TYPE,
        @NotBlank @Pattern(regexp = "[YN]") String REQUIRED_YN,
        @Size(max = 1000) String DEFAULT_VALUE,
        @Size(max = 200) String OPTION_SOURCE,
        @NotNull @Min(0) Integer SORT_ORDER,
        @NotBlank @Pattern(regexp = "[YN]") String USE_YN
) {
}
