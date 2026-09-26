package com.caron.basekit.standarddesign.requirement;

import java.time.OffsetDateTime;

public record AttachmentData(String ATTACHMENT_ID, String REQUIREMENT_ID, String ORIGINAL_FILE_NAME,
        String STORAGE_KEY, String FILE_TYPE, String MIME_TYPE, long FILE_SIZE,
        OffsetDateTime UPLOAD_DT, String ANALYSIS_STATUS) { }
