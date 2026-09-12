package com.caron.basekit.core.code;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "BASEKIT_DB_URL", matches = "jdbc:postgresql:.+")
class CoreCodePostgresIntegrationTest {

    @Autowired
    private CoreCodeService service;

    @Test
    void verifiesV2MigrationAndSeedDataOnExternalPostgres() {
        assertThat(service.findCodeGroups(null, null)).hasSizeGreaterThanOrEqualTo(5);
        assertThat(service.findCodes("USER_TYPE_CODE", null, null))
                .extracting(CommonCodeData::CODE)
                .contains("INTERNAL", "EXTERNAL");
    }
}
