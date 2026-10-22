package com.caron.basekit.core.role;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
interface RoleMapper {
    List<RoleData> findRoles(@Param("KEYWORD") String keyword, @Param("USE_YN") String useYn);
    RoleData findRole(@Param("ROLE_ID") String roleId);
    int countRoleId(@Param("ROLE_ID") String roleId);
    int countRoleCode(@Param("ROLE_CODE") String roleCode, @Param("EXCLUDE_ROLE_ID") String excludeRoleId);
    int insertRole(RoleData role);
    int updateRole(RoleData role);
    int logicalDeleteRole(@Param("ROLE_ID") String roleId, @Param("MOD_BY") String modifiedBy);

    // Role → Program 권한
    List<RolePermissionData.RoleProgramPermission> findRolePrograms(@Param("ROLE_ID") String roleId);
    int deleteRolePrograms(@Param("ROLE_ID") String roleId);
    int insertRoleProgram(@Param("ROLE_ID") String roleId, @Param("PROGRAM_ID") String programId,
                          @Param("ALLOW_YN") String allowYn, @Param("REG_BY") String regBy);

    // Role → ButtonGroup 권한
    List<RolePermissionData.RoleButtonGroupPermission> findRoleButtonGroups(@Param("ROLE_ID") String roleId);
    int deleteRoleButtonGroups(@Param("ROLE_ID") String roleId);
    int insertRoleButtonGroup(@Param("ROLE_ID") String roleId, @Param("PROGRAM_ID") String programId,
                              @Param("GROUP_CODE") String groupCode, @Param("ALLOW_YN") String allowYn,
                              @Param("REG_BY") String regBy);
}