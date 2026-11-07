package com.caron.basekit.core.documentnumber;

import java.time.OffsetDateTime;

public record DocumentNumberIssueData(
        String ISSUE_ID, String RULE_KEY, Integer RULE_VERSION, String SCOPE_KEY, String PERIOD_KEY,
        Long SEQUENCE_VALUE, String DOCUMENT_NUMBER, String IDEMPOTENCY_KEY, String ISSUE_STATUS,
        String BUSINESS_REF, OffsetDateTime REG_DT, OffsetDateTime MOD_DT) { }
