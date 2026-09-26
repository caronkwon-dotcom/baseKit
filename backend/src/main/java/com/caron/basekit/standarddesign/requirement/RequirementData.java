package com.caron.basekit.standarddesign.requirement;

import java.time.OffsetDateTime;
import java.util.List;

public record RequirementData(String REQUIREMENT_ID, String PROJECT_ID, String REQUIREMENT_NAME,
        String REQUIREMENT_TYPE_CODE, String DESCRIPTION, String PROCESS_DESCRIPTION, String STATUS,
        String LEGACY_WBS_IDS, String LEGACY_SCREEN_IDS, String LEGACY_TABLE_IDS, String LEGACY_SOURCE_ID,
        OffsetDateTime REG_DT, List<String> MENU_KEYS, List<AttachmentData> ATTACHMENTS) { }
