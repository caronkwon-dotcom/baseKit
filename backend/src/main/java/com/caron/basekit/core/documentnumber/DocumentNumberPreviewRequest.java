package com.caron.basekit.core.documentnumber;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;

public record DocumentNumberPreviewRequest(
        @NotBlank String RULE_KEY,
        Integer RULE_VERSION,
        @Size(max = 160) String SCOPE_KEY,
        @Valid DocumentNumberRuleSaveRequest DRAFT_RULE) { }
