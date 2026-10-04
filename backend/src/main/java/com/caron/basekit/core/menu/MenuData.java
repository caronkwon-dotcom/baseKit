package com.caron.basekit.core.menu;

import java.time.OffsetDateTime;

public record MenuData(
        String MENU_KEY, String MENU_NAME, String PARENT_MENU_KEY,
        String MENU_TYPE_CODE, Integer SORT_ORDER, String PROGRAM_KEY,
        String USE_YN, String DEL_YN, OffsetDateTime REG_DT, String REG_BY,
        OffsetDateTime MOD_DT, String MOD_BY) {
}
