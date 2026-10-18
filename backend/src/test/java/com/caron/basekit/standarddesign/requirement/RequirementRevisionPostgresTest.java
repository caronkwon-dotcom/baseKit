package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.standarddesign.requirementgroup.RequirementGroupService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit development PostgreSQL opt-in; all business rows are rolled back. */
@SpringBootTest(properties={"spring.datasource.url=${BASEKIT_DB_URL:jdbc:postgresql://localhost:5432/basekit}","spring.datasource.username=${BASEKIT_DB_USERNAME:basekit}","spring.datasource.password=${BASEKIT_DB_PASSWORD:basekit}","spring.datasource.driver-class-name=org.postgresql.Driver","standard-design.requirements.storage-path=${java.io.tmpdir}/basekit-pg-revision-review"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="BASEKIT_PG_REVISION_REVIEW", matches="true")
@Transactional
class RequirementRevisionPostgresTest {
 @Autowired RequirementService requirements;
 @Autowired RequirementGroupService groups;
 @Autowired JdbcTemplate jdbc;
 @Autowired ObjectMapper json;
 @Autowired MockMvc mvc;
 RequirementRevisionIntegrationTest fixture() throws Exception {
  try(var c=jdbc.getDataSource().getConnection()){assertEquals("PostgreSQL",c.getMetaData().getDatabaseProductName());}
  var t=new RequirementRevisionIntegrationTest();t.requirements=requirements;t.groups=groups;t.jdbc=jdbc;t.json=json;t.mvc=mvc;return t;
 }
 @Test void revisionAndGroupEvidence() throws Exception {fixture().referencedDraftCannotBeEditedAndConfirmationPreservesGroupEvidence();}
 @Test void attachmentLinksAndBytes() throws Exception {fixture().attachmentEntitiesAreSharedAndExclusionAndReplacementKeepPriorBytes();}
 @Test void cancellation() throws Exception {fixture().cancelledDraftKeepsCurrentAndRevisionNumbersAreNotReused();}
 @Test void logicalDiscard() throws Exception {fixture().discardIsLogicalAuditedIdempotentAndPreventsNewGrouping();}
 @Test void actualAnalysisReference() throws Exception {fixture().projectAnalysisSnapshotLocksActualRevisionWithoutGroupOrManualStatus();}
 @Test void httpContract() throws Exception {fixture().httpApiRequiresReasonAndRecordsAuthenticatedActor();}
}
