package com.caron.basekit.core.database;

import java.time.OffsetDateTime;

public record CoreDatabaseMarker(
        String MARKER_CODE,
        String DESCRIPTION,
        OffsetDateTime CREATED_AT
) {
}
