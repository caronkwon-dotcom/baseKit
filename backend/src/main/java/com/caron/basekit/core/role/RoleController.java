package com.caron.basekit.core.role;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/core/roles")
public class RoleController {
    private final RoleService service;
    RoleController(RoleService service) { this.service = service; }

    @GetMapping
    ApiResponse<List<RoleData>> findRoles(
            @RequestParam(name = "KEYWORD", required = false) String keyword,
            @RequestParam(name = "USE_YN", required = false) String useYn) {
        return ApiResponse.success(service.findRoles(keyword, useYn));
    }

    @GetMapping("/{id}")
    ApiResponse<RoleData> findRole(@PathVariable String id) {
        return ApiResponse.success(service.findRole(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<RoleData> create(@Valid @RequestBody RoleSaveRequest request) {
        return ApiResponse.success(service.createRole(request));
    }

    @PutMapping("/{id}")
    ApiResponse<RoleData> update(@PathVariable String id, @Valid @RequestBody RoleSaveRequest request) {
        return ApiResponse.success(service.updateRole(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        service.deleteRole(id);
    }

    // ===== Role 권한 (Program + ButtonGroup) =====

    @GetMapping("/{id}/permissions")
    ApiResponse<RolePermissionData> findPermissions(@PathVariable String id) {
        return ApiResponse.success(service.findRolePermissions(id));
    }

    @PutMapping("/{id}/permissions")
    ApiResponse<RolePermissionData> savePermissions(@PathVariable String id,
                                                    @Valid @RequestBody RolePermissionSaveRequest request) {
        return ApiResponse.success(service.saveRolePermissions(id, request));
    }
}