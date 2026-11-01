package com.caron.basekit.core.menu;

import java.util.List;

public record MenuRuntimeData(List<MenuTreeData> MENUS, List<MenuProgramIssue> INVALID_PROGRAM_MENUS) {
}
