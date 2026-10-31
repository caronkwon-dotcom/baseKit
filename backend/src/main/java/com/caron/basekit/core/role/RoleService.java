package com.caron.basekit.core.role;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class RoleService {
    private static final String SYSTEM_ACTOR = "system";
    private static final ZoneId SYSTEM_ZONE = ZoneId.of("Asia/Seoul");
    private final RoleMapper mapper;
    RoleService(RoleMapper mapper) { this.mapper = mapper; }

    @Transactional(readOnly = true)
    public List<RoleData> findRoles(String keyword, String useYn) {
        return mapper.findRoles(trim(keyword), trim(useYn));
    }

    @Transactional(readOnly = true)
    public RoleData findRole(String id) {
        RoleData row = mapper.findRole(id);
        if (row == null) throw new RoleNotFoundException("Role을 찾을 수 없습니다.");
        return row;
    }

    @Transactional
    public RoleData createRole(RoleSaveRequest request) {
        if (mapper.countRoleId(request.ROLE_ID()) > 0) throw new RoleConflictException("이미 사용된 Role ID입니다.");
        ensureUniqueCode(request.ROLE_CODE(), null);
        OffsetDateTime now = OffsetDateTime.now(SYSTEM_ZONE);
        RoleData row = new RoleData(request.ROLE_ID(), request.ROLE_CODE(), request.ROLE_NAME(),
                request.DESCRIPTION(), request.USE_YN(), "N", now, SYSTEM_ACTOR, now, SYSTEM_ACTOR);
        mapper.insertRole(row);
        return findRole(row.ROLE_ID());
    }

    @Transactional
    public RoleData updateRole(String id, RoleSaveRequest request) {
        if (!id.equals(request.ROLE_ID())) throw new RoleConflictException("Role ID가 요청 경로와 일치하지 않습니다.");
        RoleData current = findRole(id);
        ensureUniqueCode(request.ROLE_CODE(), id);
        RoleData row = new RoleData(current.ROLE_ID(), request.ROLE_CODE(), request.ROLE_NAME(),
                request.DESCRIPTION(), request.USE_YN(), current.DEL_YN(), current.REG_DT(), current.REG_BY(),
                OffsetDateTime.now(SYSTEM_ZONE), SYSTEM_ACTOR);
        mapper.updateRole(row);
        return findRole(id);
    }

    @Transactional
    public void deleteRole(String id) {
        findRole(id);
        mapper.logicalDeleteRole(id, SYSTEM_ACTOR);
    }

    // ===== Role 권한 (Program + ButtonGroup) =====

    @Transactional(readOnly = true)
    public RolePermissionData findRolePermissions(String roleId) {
        findRole(roleId);
        return new RolePermissionData(roleId,
                mapper.findRolePrograms(roleId),
                mapper.findRoleButtonGroups(roleId));
    }

    @Transactional
    public RolePermissionData saveRolePermissions(String roleId, RolePermissionSaveRequest request) {
        findRole(roleId);
        String actor = SYSTEM_ACTOR;
        // Program 권한 전체 교체
        mapper.deleteRolePrograms(roleId);
        if (request.PROGRAMS() != null) {
            for (RolePermissionSaveRequest.RoleProgramPermissionItem item : request.PROGRAMS()) {
                mapper.insertRoleProgram(roleId, item.PROGRAM_ID(), item.ALLOW_YN(), actor);
            }
        }
        // ButtonGroup 권한 전체 교체
        mapper.deleteRoleButtonGroups(roleId);
        if (request.BUTTON_GROUPS() != null) {
            for (RolePermissionSaveRequest.RoleButtonGroupPermissionItem item : request.BUTTON_GROUPS()) {
                mapper.insertRoleButtonGroup(roleId, item.PROGRAM_ID(), item.GROUP_CODE(), item.ALLOW_YN(), actor);
            }
        }
        return findRolePermissions(roleId);
    }

    private void ensureUniqueCode(String code, String excludeId) {
        if (mapper.countRoleCode(code, excludeId) > 0) throw new RoleConflictException("이미 사용된 Role CODE입니다.");
    }

    private static String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}