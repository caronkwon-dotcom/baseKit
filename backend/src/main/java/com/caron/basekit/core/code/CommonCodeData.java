package com.caron.basekit.core.code;

import java.time.OffsetDateTime;

public record CommonCodeData(
        String CODE_ID,
        String CODE_GROUP_ID,
        String CODE,
        String CODE_NAME,
        int SORT_ORDER,
        String USE_YN,
        String DEL_YN,
        OffsetDateTime REG_DT,
        String REG_BY,
        OffsetDateTime MOD_DT,
        String MOD_BY
) {
}
