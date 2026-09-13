package com.caron.basekit.core.program;

import java.time.OffsetDateTime;

public record ProgramData(
        String PROGRAM_ID, String PROGRAM_KEY, String PROGRAM_NAME,
        String MODULE_CODE, String PROGRAM_TYPE_CODE, String ROUTE, String DESCRIPTION,
        String USE_YN, String DEL_YN, OffsetDateTime REG_DT, String REG_BY,
        OffsetDateTime MOD_DT, String MOD_BY) {
}
