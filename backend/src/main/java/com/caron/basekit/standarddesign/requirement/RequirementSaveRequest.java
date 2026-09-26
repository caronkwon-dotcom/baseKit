package com.caron.basekit.standarddesign.requirement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RequirementSaveRequest(
        @NotBlank @Size(max = 50) String PROJECT_ID,
        @NotBlank @Size(max = 200) String REQUIREMENT_NAME,
        @NotBlank @Size(max = 50) String REQUIREMENT_TYPE_CODE,
        @Size(max = 10000) String DESCRIPTION,
        @Size(max = 10000) String PROCESS_DESCRIPTION,
        @NotBlank @Size(max = 30) String STATUS,
        List<@NotBlank String> MENU_KEYS,
        @Size(max = 2000) String LEGACY_WBS_IDS, @Size(max = 2000) String LEGACY_SCREEN_IDS,
        @Size(max = 2000) String LEGACY_TABLE_IDS,
        @Size(max = 100) String LEGACY_SOURCE_ID) { }
