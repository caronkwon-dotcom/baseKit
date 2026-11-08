package com.caron.basekit.core.documentnumber;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DocumentNumberRuleSaveRequest(
        @NotBlank @Size(max = 80) @Pattern(regexp = "[A-Z0-9][A-Z0-9_]*") String RULE_KEY,
        @NotBlank @Size(max = 160) String RULE_NAME,
        @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Za-z0-9_-]*") String PREFIX,
        @NotBlank @Pattern(regexp = "NONE|YYYY|YYYYMM") String DATE_FORMAT,
        @NotNull @Min(1) @Max(18) Integer SEQUENCE_LENGTH,
        @NotNull @Min(1) Long START_VALUE,
        @NotNull @Min(1) Long INCREMENT_VALUE,
        @NotBlank @Pattern(regexp = "NONE|YEAR|MONTH") String RESET_CYCLE,
        @NotBlank @Pattern(regexp = "GLOBAL|MODULE|PROJECT") String SCOPE_TYPE,
        @NotBlank @Pattern(regexp = "Y|N") String USE_YN,
        @Size(max = 500) String DESCRIPTION) { }
