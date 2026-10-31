package com.caron.basekit.core.role;

import java.util.List;

/**
 * Role 기준 Runtime 권한 조회 결과.
 * PROGRAMS: Role이 접근 가능한 Program (메뉴 노출/실행 권한)
 * BUTTON_GROUPS: Program 내부 ButtonGroup(액션 그룹) 접근 권한
 */
public record RolePermissionData(
        String ROLE_ID,
        List<RoleProgramPermission> PROGRAMS,
        List<RoleButtonGroupPermission> BUTTON_GROUPS) {

    public record RoleProgramPermission(
            String PROGRAM_ID, String PROGRAM_NAME, String MODULE_CODE, String ALLOW_YN) {
    }

    public record RoleButtonGroupPermission(
            String PROGRAM_ID, String GROUP_CODE, String GROUP_NAME, String ALLOW_YN) {
    }
}