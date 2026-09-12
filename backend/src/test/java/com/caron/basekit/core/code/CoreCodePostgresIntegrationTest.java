package com.caron.basekit.core.code;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    @Transactional
    void performsCrudOnExternalPostgresAndRollsBackTestData() {
        service.createCodeGroup(new CodeGroupSaveRequest(
                "POSTGRES_UI_TEST", "PostgreSQL UI 검증", "표준 CRUD 검증", "Y"));
        service.createCode(new CommonCodeSaveRequest(
                "POSTGRES_UI_TEST_A", "POSTGRES_UI_TEST", "A", "검증 코드", 1, "Y"));

        CommonCodeData updated = service.updateCode("POSTGRES_UI_TEST_A", new CommonCodeSaveRequest(
                "POSTGRES_UI_TEST_A", "POSTGRES_UI_TEST", "A", "검증 코드 수정", 2, "N"));
        assertThat(updated.CODE_NAME()).isEqualTo("검증 코드 수정");
        assertThat(updated.SORT_ORDER()).isEqualTo(2);
        assertThat(updated.USE_YN()).isEqualTo("N");

        service.deleteCode("POSTGRES_UI_TEST_A");
        assertThatThrownBy(() -> service.findCode("POSTGRES_UI_TEST_A"))
                .isInstanceOf(CoreCodeNotFoundException.class);
        service.deleteCodeGroup("POSTGRES_UI_TEST");
        assertThatThrownBy(() -> service.findCodeGroup("POSTGRES_UI_TEST"))
                .isInstanceOf(CoreCodeNotFoundException.class);
    }
}
