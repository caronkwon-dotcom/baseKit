package com.caron.basekit.core.menu;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
interface MenuMapper {
    List<MenuData> findMenus(@Param("KEYWORD") String keyword,
                             @Param("PARENT_MENU_KEY") String parentMenuKey,
                             @Param("MENU_TYPE_CODE") String menuTypeCode,
                             @Param("PROGRAM_KEY") String programKey,
                             @Param("USE_YN") String useYn);

    MenuData findMenu(@Param("MENU_KEY") String menuKey);

    int countMenuKey(@Param("MENU_KEY") String menuKey);

    int countActiveChildren(@Param("PARENT_MENU_KEY") String parentMenuKey);

    int countActiveProgram(@Param("PROGRAM_KEY") String programKey);

    int countActiveMenuType(@Param("MENU_TYPE_CODE") String menuTypeCode);

    int insertMenu(MenuData menu);

    int updateMenu(MenuData menu);

    int logicalDeleteMenu(@Param("MENU_KEY") String menuKey, @Param("MOD_BY") String modifiedBy);
}
