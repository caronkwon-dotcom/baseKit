package com.caron.basekit.standarddesign.requirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
public record RequirementChangeRequest(@NotNull @Positive Long REVISION, @NotNull @Positive Long VERSION,
 @Valid RequirementSaveRequest CONTENT) { }
