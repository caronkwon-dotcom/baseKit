package com.caron.basekit.core.documentnumber;

import java.time.OffsetDateTime;

public record DocumentNumberRuleData(
        String RULE_KEY, Integer RULE_VERSION, String RULE_NAME, String PREFIX, String DATE_FORMAT,
        Integer SEQUENCE_LENGTH, Long START_VALUE, Long INCREMENT_VALUE, String RESET_CYCLE,
        String SCOPE_TYPE, String USE_YN, String DESCRIPTION, Long CURRENT_VALUE,
        OffsetDateTime REG_DT, String REG_BY, OffsetDateTime MOD_DT, String MOD_BY) { }
