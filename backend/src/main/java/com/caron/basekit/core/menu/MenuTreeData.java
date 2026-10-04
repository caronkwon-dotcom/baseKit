package com.caron.basekit.core.menu;

import java.util.List;

public record MenuTreeData(
        String MENU_KEY, String MENU_NAME, String PARENT_MENU_KEY,
        String MENU_TYPE_CODE, Integer SORT_ORDER, String PROGRAM_KEY,
        Integer MENU_LEVEL, List<MenuTreeData> CHILDREN) {
}
