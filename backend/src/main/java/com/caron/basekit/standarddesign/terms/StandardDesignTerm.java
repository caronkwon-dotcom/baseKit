package com.caron.basekit.standarddesign.terms;

record StandardDesignTerm(
        String TERM_ID,
        int SOURCE_ROW_NUMBER,
        String COMMON_STANDARD_TERM_NAME,
        String COMMON_STANDARD_TERM_DESCRIPTION,
        String COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME,
        String COMMON_STANDARD_DOMAIN_NAME,
        String ALLOWED_VALUES,
        String STORAGE_FORMAT,
        String DISPLAY_FORMAT,
        String ADMINISTRATIVE_STANDARD_CODE_NAME,
        String RESPONSIBLE_ORGANIZATION_NAME,
        String TERM_SYNONYMS,
        String ESTABLISHMENT_ROUND,
        String REVISION_TYPE_NAME,
        String REVISION_ITEM,
        String REVISION_REASON
) {
    String searchText() {
        return String.join("\u0000",
                COMMON_STANDARD_TERM_NAME,
                COMMON_STANDARD_TERM_DESCRIPTION,
                COMMON_STANDARD_TERM_ENGLISH_ABBREVIATION_NAME,
                COMMON_STANDARD_DOMAIN_NAME,
                ALLOWED_VALUES,
                STORAGE_FORMAT,
                DISPLAY_FORMAT,
                ADMINISTRATIVE_STANDARD_CODE_NAME,
                RESPONSIBLE_ORGANIZATION_NAME,
                TERM_SYNONYMS,
                ESTABLISHMENT_ROUND,
                REVISION_TYPE_NAME,
                REVISION_ITEM,
                REVISION_REASON
        ).toLowerCase();
    }
}
