package com.caron.basekit.core.menu;

import org.flywaydb.core.Flyway;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class MenuProgramSeedMigrationTest {
    private static final String MIGRATION = "db/migration/V24__seed_core_menu_program.sql";

    @Test
    void seedsAllManifestMenusAndMissingProgramsAndCanBeReplayed() throws Exception {
        var dataSource = createDatabaseAtV23();
        var jdbc = new JdbcTemplate(dataSource);

        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

        assertSeededInventory(jdbc);
        assertEquals("/system/programs", jdbc.queryForObject(
                "SELECT ROUTE FROM BSYPROG WHERE PROGRAM_KEY='PROGRAM_MGMT'", String.class));
        assertEquals("GRID", jdbc.queryForObject(
                "SELECT PROGRAM_TYPE_CODE FROM BSYPROG WHERE PROGRAM_KEY='PROGRAM_MGMT'", String.class));

        replaySeed(dataSource);

        assertSeededInventory(jdbc);
    }

    @Test
    void preservesPreexistingProgramAndMenuRowsOnKeyCollision() throws Exception {
        var dataSource = createDatabaseAtV23();
        var jdbc = new JdbcTemplate(dataSource);
        jdbc.update("""
                INSERT INTO BSYPROG
                    (PROGRAM_ID, PROGRAM_KEY, PROGRAM_NAME, MODULE_CODE, PROGRAM_TYPE_CODE, ROUTE, USE_YN, DEL_YN, REG_BY, MOD_BY)
                VALUES ('TERM_OVERRIDE', 'TERM_CURATION', 'Existing term program', 'SYSTEM', 'GRID_DETAIL', '/custom/terms', 'Y', 'N', 'existing', 'existing')
                """);
        jdbc.update("""
                INSERT INTO BSYMENU
                    (MENU_KEY, MENU_NAME, PARENT_MENU_KEY, MENU_TYPE_CODE, SORT_ORDER, PROGRAM_KEY, USE_YN, DEL_YN, REG_BY, MOD_BY)
                VALUES ('SYS', 'Existing system menu', NULL, 'FOLDER', 777, NULL, 'Y', 'N', 'existing', 'existing')
                """);

        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

        assertSeededInventory(jdbc);
        assertEquals("Existing system menu", jdbc.queryForObject(
                "SELECT MENU_NAME FROM BSYMENU WHERE MENU_KEY='SYS'", String.class));
        assertEquals(777, jdbc.queryForObject(
                "SELECT SORT_ORDER FROM BSYMENU WHERE MENU_KEY='SYS'", Integer.class));
        assertEquals("TERM_OVERRIDE", jdbc.queryForObject(
                "SELECT PROGRAM_ID FROM BSYPROG WHERE PROGRAM_KEY='TERM_CURATION'", String.class));
        assertEquals("/custom/terms", jdbc.queryForObject(
                "SELECT ROUTE FROM BSYPROG WHERE PROGRAM_KEY='TERM_CURATION'", String.class));

        replaySeed(dataSource);

        assertSeededInventory(jdbc);
        assertEquals("Existing system menu", jdbc.queryForObject(
                "SELECT MENU_NAME FROM BSYMENU WHERE MENU_KEY='SYS'", String.class));
        assertEquals("/custom/terms", jdbc.queryForObject(
                "SELECT ROUTE FROM BSYPROG WHERE PROGRAM_KEY='TERM_CURATION'", String.class));
    }

    private JdbcDataSource createDatabaseAtV23() {
        var dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:menu-seed-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource.setUser("sa");
        dataSource.setPassword("");
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("23").load().migrate();
        return dataSource;
    }

    private void assertSeededInventory(JdbcTemplate jdbc) {
        assertEquals(27, jdbc.queryForObject("SELECT COUNT(*) FROM BSYPROG", Integer.class));
        assertEquals(31, jdbc.queryForObject("SELECT COUNT(*) FROM BSYMENU", Integer.class));
        assertEquals(5, jdbc.queryForObject(
                "SELECT COUNT(*) FROM BSYMENU WHERE MENU_TYPE_CODE='FOLDER'", Integer.class));
        assertEquals(26, jdbc.queryForObject(
                "SELECT COUNT(*) FROM BSYMENU WHERE MENU_TYPE_CODE='PAGE'", Integer.class));
        assertEquals(3, jdbc.queryForObject(
                "SELECT COUNT(*) FROM BSYMENU WHERE PARENT_MENU_KEY IS NULL", Integer.class));
        assertEquals(0, jdbc.queryForObject("""
                SELECT COUNT(*) FROM BSYMENU m
                LEFT JOIN BSYMENU p ON p.MENU_KEY=m.PARENT_MENU_KEY
                WHERE m.PARENT_MENU_KEY IS NOT NULL AND p.MENU_KEY IS NULL
                """, Integer.class));
        assertEquals(0, jdbc.queryForObject("""
                SELECT COUNT(*) FROM BSYMENU m
                LEFT JOIN BSYPROG p ON p.PROGRAM_KEY=m.PROGRAM_KEY
                WHERE m.MENU_TYPE_CODE='PAGE' AND p.PROGRAM_KEY IS NULL
                """, Integer.class));
        assertEquals(0, jdbc.queryForObject("""
                SELECT COUNT(*) FROM BSYMENU
                WHERE (MENU_TYPE_CODE='FOLDER' AND PROGRAM_KEY IS NOT NULL)
                   OR (MENU_TYPE_CODE='PAGE' AND PROGRAM_KEY IS NULL)
                """, Integer.class));
        assertEquals(45, menuSort(jdbc, "STANDARD_DESIGN.REQUIREMENT_GROUP"));
        assertEquals(46, menuSort(jdbc, "STANDARD_DESIGN.MENU_DESIGN"));
        assertEquals(46, menuSort(jdbc, "STANDARD_DESIGN.PROGRAM_REGISTER")); // V30: same order as menu design, listed after it by MENU_KEY
        assertEquals(47, menuSort(jdbc, "STANDARD_DESIGN.SCREEN"));

        Map<String, String> parents = new HashMap<>();
        jdbc.query("SELECT MENU_KEY, PARENT_MENU_KEY FROM BSYMENU", (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                parents.put(rs.getString(1), rs.getString(2)));
        int maxDepth = parents.keySet().stream().mapToInt(key -> depth(key, parents)).max().orElse(0);
        assertEquals(3, maxDepth);
        assertNull(parents.get("SYS"));
    }

    private int menuSort(JdbcTemplate jdbc, String menuKey) {
        return jdbc.queryForObject("SELECT SORT_ORDER FROM BSYMENU WHERE MENU_KEY=?", Integer.class, menuKey);
    }

    private int depth(String key, Map<String, String> parents) {
        int result = 1;
        String parent = parents.get(key);
        while (parent != null) {
            result++;
            parent = parents.get(parent);
        }
        return result;
    }

    private void replaySeed(JdbcDataSource dataSource) throws Exception {
        String sql = new ClassPathResource(MIGRATION).getContentAsString(StandardCharsets.UTF_8);
        String statements = sql.lines()
                .filter(line -> !line.stripLeading().startsWith("--"))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            for (String command : statements.split(";")) {
                if (!command.isBlank()) statement.execute(command);
            }
        }
    }
}
