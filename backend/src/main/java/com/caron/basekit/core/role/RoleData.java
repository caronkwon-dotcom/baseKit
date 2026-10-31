package com.caron.basekit.core.role;

import java.time.OffsetDateTime;

public record RoleData(
        String ROLE_ID, String ROLE_CODE, String ROLE_NAME, String DESCRIPTION,
        String USE_YN, String DEL_YN, OffsetDateTime REG_DT, String REG_BY,
        OffsetDateTime MOD_DT, String MOD_BY) {
}