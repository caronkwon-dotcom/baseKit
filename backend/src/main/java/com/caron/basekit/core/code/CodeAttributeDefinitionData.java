package com.caron.basekit.core.code;

import java.time.OffsetDateTime;

public record CodeAttributeDefinitionData(
        String ATTRIBUTE_DEF_ID,
        String CODE_GROUP_ID,
        String ATTRIBUTE_CODE,
        String ATTRIBUTE_NAME,
        String DATA_TYPE,
        String CONTROL_TYPE,
        String DISPLAY_TYPE,
        String REQUIRED_YN,
        String DEFAULT_VALUE,
        String OPTION_SOURCE,
        int SORT_ORDER,
        String USE_YN,
        String DEL_YN,
        OffsetDateTime REG_DT,
        String REG_BY,
        OffsetDateTime MOD_DT,
        String MOD_BY
) {
}
