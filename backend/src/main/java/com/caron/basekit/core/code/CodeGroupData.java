package com.caron.basekit.core.code;

import java.time.OffsetDateTime;

public record CodeGroupData(
        String CODE_GROUP_ID,
        String CODE_GROUP_NAME,
        String DESCRIPTION,
        String USE_YN,
        String DEL_YN,
        OffsetDateTime REG_DT,
        String REG_BY,
        OffsetDateTime MOD_DT,
        String MOD_BY
) {
}
