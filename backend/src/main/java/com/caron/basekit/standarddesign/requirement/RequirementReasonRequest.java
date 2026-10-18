package com.caron.basekit.standarddesign.requirement;
import jakarta.validation.constraints.*;
public record RequirementReasonRequest(@NotBlank @Size(max=2000) String REASON) { }
