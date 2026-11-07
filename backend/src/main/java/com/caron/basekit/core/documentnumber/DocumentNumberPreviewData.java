package com.caron.basekit.core.documentnumber;

public record DocumentNumberPreviewData(
        String RULE_KEY, Integer RULE_VERSION, String PERIOD_KEY, Long NEXT_CANDIDATE,
        String DOCUMENT_NUMBER, boolean CONSUMES_NUMBER) { }
