package com.caron.basekit.standarddesign.projectmenu;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectMenuSaveRequest(
        @NotBlank @Size(max = 50) String PROJECT_ID,
        @NotBlank @Size(max = 100) String MENU_ID,
        @NotBlank @Size(max = 200) String MENU_NAME,
        Integer MENU_LEVEL,
        @Size(max = 100) String LEVEL1_MENU_ID,
        Integer SORT_ORDER) { }
