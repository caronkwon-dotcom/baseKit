package com.caron.basekit.core.database;

import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@Service
public class CoreDatabaseStatusService {

    private final CoreDatabaseMarkerMapper markerMapper;
    private final DataSource dataSource;

    public CoreDatabaseStatusService(CoreDatabaseMarkerMapper markerMapper, DataSource dataSource) {
        this.markerMapper = markerMapper;
        this.dataSource = dataSource;
    }

    public CoreDatabaseStatus getStatus() {
        CoreDatabaseMarker marker = markerMapper.findFoundationMarker();
        if (marker == null) {
            throw new IllegalStateException("BaseKit Core database migration marker is missing");
        }

        return new CoreDatabaseStatus(
                "UP",
                databaseProductName(),
                true,
                marker
        );
    }

    private String databaseProductName() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName();
        } catch (SQLException exception) {
            throw new IllegalStateException("BaseKit Core database metadata is unavailable", exception);
        }
    }
}
