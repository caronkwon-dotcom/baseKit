package com.caron.basekit.standarddesign.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Explicit PostgreSQL opt-in (set BASEKIT_PG_PROJECT_REVIEW=true and BASEKIT_DB_URL/USERNAME/PASSWORD for a throwaway database).
 * Starting the context applies Flyway V26 and V27 to that database; every business row written by the tests is rolled back.
 */
@SpringBootTest(properties = {"spring.datasource.url=${BASEKIT_DB_URL:jdbc:postgresql://localhost:5432/basekit}", "spring.datasource.username=${BASEKIT_DB_USERNAME:basekit}", "spring.datasource.password=${BASEKIT_DB_PASSWORD:}"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "BASEKIT_PG_PROJECT_REVIEW", matches = "true")
@Transactional
class ProjectPostgresTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;

 ProjectIntegrationTest fixture() throws Exception {
  try (var connection = jdbc.getDataSource().getConnection()) { assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName()); }
  var test = new ProjectIntegrationTest();
  test.mvc = mvc; test.json = json; test.jdbc = jdbc;
  return test;
 }
 @Test void lifecycle() throws Exception { fixture().projectsAreRegisteredReadUpdatedAndLogicallyDeletedOnTheServer(); }
 @Test void validation() throws Exception { fixture().theServerValidatesWhatTheScreenUsedToCheckAlone(); }
 @Test void dependentsBlockDeletion() throws Exception { fixture().aProjectWithServerDataCannotBeDeleted(); }
 @Test void masterNameInSnapshot() throws Exception { fixture().theSnapshotUsesTheMasterNameRegardlessOfWhatTheBrowserSent(); }
 @Test void backfill() throws Exception { fixture().backfillRegistersEveryReferencedProjectOnceAndCanBeRunAgain(); }
}
