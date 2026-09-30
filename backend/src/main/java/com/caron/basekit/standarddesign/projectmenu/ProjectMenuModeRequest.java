package com.caron.basekit.standarddesign.projectmenu;

import jakarta.validation.constraints.NotBlank;

public record ProjectMenuModeRequest(@NotBlank String PROJECT_ID, @NotBlank String MENU_MANAGEMENT_MODE) { }
