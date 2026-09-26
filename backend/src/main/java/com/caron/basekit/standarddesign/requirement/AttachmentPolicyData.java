package com.caron.basekit.standarddesign.requirement;

import java.util.List;
import java.util.Map;

public record AttachmentPolicyData(long MAX_FILE_SIZE, long MAX_REQUEST_SIZE, int MAX_FILES,
    List<String> ALLOWED_EXTENSIONS, List<String> ALLOWED_MIME_TYPES, Map<String, String> MIME_BY_EXTENSION) { }
