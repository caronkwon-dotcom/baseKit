package com.caron.basekit.core.endpoint;

import jakarta.validation.constraints.*;

public record ButtonGroup(
        @NotBlank @Size(max=100) @Pattern(regexp="(COMMON|CUSTOM)\\.[A-Z][A-Z0-9_]*") String GROUP_CODE,
        @NotBlank @Pattern(regexp="COMMON|CUSTOM") String GROUP_TYPE,
        @NotBlank @Size(max=100) String GROUP_NAME,
        @Size(max=500) String DESCRIPTION,
        @NotBlank @Pattern(regexp="Y|N") String USE_YN) {}
