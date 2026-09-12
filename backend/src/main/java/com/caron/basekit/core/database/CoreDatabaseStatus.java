package com.caron.basekit.core.database;

public record CoreDatabaseStatus(
        String STATUS,
        String DATABASE_PRODUCT,
        boolean MIGRATION_READY,
        CoreDatabaseMarker MIGRATION_MARKER
) {
}
