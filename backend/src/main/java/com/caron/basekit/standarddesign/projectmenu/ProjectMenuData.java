package com.caron.basekit.standarddesign.projectmenu;

import java.time.OffsetDateTime;

public record ProjectMenuData(String PROJECT_MENU_ID, String PROJECT_ID, String MENU_ID, String MENU_NAME,
        Integer MENU_LEVEL, String LEVEL1_MENU_ID, Integer SORT_ORDER, OffsetDateTime REG_DT,
        OffsetDateTime MOD_DT) { }
