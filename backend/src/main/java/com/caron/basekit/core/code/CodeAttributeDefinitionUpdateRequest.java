package com.caron.basekit.core.code;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CodeAttributeDefinitionUpdateRequest(
        @NotBlank String ATTRIBUTE_DEF_ID,
        @NotNull @Valid CodeAttributeDefinitionSaveRequest VALUE
) {
}
