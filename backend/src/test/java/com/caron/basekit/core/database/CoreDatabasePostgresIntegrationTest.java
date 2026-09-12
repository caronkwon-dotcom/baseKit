package com.caron.basekit.core.database;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "BASEKIT_DB_URL", matches = "jdbc:postgresql:.+")
class CoreDatabasePostgresIntegrationTest {

    @Autowired
    private CoreDatabaseStatusService statusService;

    @Test
    void verifiesExternalPostgresAndFlywayMarker() {
        CoreDatabaseStatus status = statusService.getStatus();

        assertThat(status.STATUS()).isEqualTo("UP");
        assertThat(status.DATABASE_PRODUCT()).containsIgnoringCase("PostgreSQL");
        assertThat(status.MIGRATION_READY()).isTrue();
        assertThat(status.MIGRATION_MARKER().MARKER_CODE()).isEqualTo("BACKEND_FOUNDATION_V1");
    }
}
