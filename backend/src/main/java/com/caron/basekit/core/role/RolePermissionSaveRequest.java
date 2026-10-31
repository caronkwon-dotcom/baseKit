package com.caron.basekit.core.role;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Role 권한 저장 요청.
 * PROGRAMS: Role이 접근할 Program 목록 (메뉴 노출/실행)
 * BUTTON_GROUPS: Program 내부 ButtonGroup 접근 목록
 * 저장 시 기존 권한을 전체 교체한다 (replace semantics).
 */
public record RolePermissionSaveRequest(
        @Valid List<RoleProgramPermissionItem> PROGRAMS,
        @Valid List<RoleButtonGroupPermissionItem> BUTTON_GROUPS) {

    public record RoleProgramPermissionItem(
            @NotBlank @Size(max = 50) String PROGRAM_ID,
            @NotBlank @Pattern(regexp = "[YN]") String ALLOW_YN) {
    }

    public record RoleButtonGroupPermissionItem(
            @NotBlank @Size(max = 50) String PROGRAM_ID,
            @NotBlank @Size(max = 100) String GROUP_CODE,
            @NotBlank @Pattern(regexp = "[YN]") String ALLOW_YN) {
    }
}