package com.caron.basekit.standarddesign.projectmenu;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ProjectMenuMapper {
    String findMode(@Param("PROJECT_ID") String projectId);
    int insertMode(@Param("PROJECT_ID") String projectId, @Param("MENU_MANAGEMENT_MODE") String mode);
    int updateMode(@Param("PROJECT_ID") String projectId, @Param("MENU_MANAGEMENT_MODE") String mode);
    List<ProjectMenuData> findAll(@Param("PROJECT_ID") String projectId);
    ProjectMenuData findOne(@Param("PROJECT_MENU_ID") String id);
    int countByMenuId(@Param("PROJECT_ID") String projectId, @Param("MENU_ID") String menuId, @Param("PROJECT_MENU_ID") String excludeId);
    int countLevel1(@Param("PROJECT_ID") String projectId, @Param("MENU_ID") String menuId);
    int insert(ProjectMenuData row);
    int update(ProjectMenuData row);
    int delete(@Param("PROJECT_MENU_ID") String id);
    int countRequirementReferences(@Param("PROJECT_MENU_ID") String id);
    int insertRequirementRelation(@Param("REQUIREMENT_ID") String requirementId, @Param("PROJECT_MENU_ID") String projectMenuId);
    int deleteRequirementRelations(@Param("REQUIREMENT_ID") String requirementId);
}
