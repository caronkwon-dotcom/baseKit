package com.caron.basekit.standarddesign.requirementgroup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;

/** Explicit opt-in. Every draft edit/group/link created by this test is rolled back. */
@SpringBootTest(properties={"spring.datasource.url=${BASEKIT_DB_URL:jdbc:postgresql://localhost:5432/basekit}","spring.datasource.username=${BASEKIT_DB_USERNAME:basekit}","spring.datasource.password=${BASEKIT_DB_PASSWORD:basekit}","spring.datasource.driver-class-name=org.postgresql.Driver"})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="BASEKIT_PG_GROUPING_REVIEW_ID", matches="PG-.+")
class ProjectGroupingPostgresTest {
    @Autowired ProjectGroupingService service;
    @Autowired RequirementGroupService groups;
    @Autowired JdbcTemplate jdbc;
    @Test @Transactional void registersDraftWithMembersAndEvidenceThenRollsBack() throws Exception {
        try (var connection=jdbc.getDataSource().getConnection()) { assertEquals("PostgreSQL",connection.getMetaData().getDatabaseProductName()); }
        String id=System.getenv("BASEKIT_PG_GROUPING_REVIEW_ID");
        String project=jdbc.queryForObject("SELECT PROJECT_ID FROM BSDPGANL WHERE ANALYSIS_ID=?",String.class,id);
        var run=service.get(project,id);assertEquals("SUCCESS",run.get("STATUS"));
        long version=((Number)run.get("VERSION")).longValue();ObjectNode draft=((JsonNode)run.get("DRAFT")).deepCopy();
        var g=(ObjectNode)draft.path("GROUPS").get(0);g.put("REVIEW_STATUS","APPROVED");String gid=g.path("GROUP_ID").asText();
        int before=groups.list(project,null).size();service.save(project,id,version,draft);
        service.register(project,id,version+1,List.of(gid));service.register(project,id,version+1,List.of(gid));
        assertEquals(before+1,groups.list(project,null).size());
        String registered=jdbc.queryForObject("SELECT REQUIREMENT_GROUP_ID FROM BSDPGLNK WHERE ANALYSIS_ID=? AND DRAFT_GROUP_ID=?",String.class,id,gid);
        var saved=groups.get(registered);assertEquals("DRAFT",saved.get("GROUP_STATUS"));
        assertEquals(g.path("MEMBERS").size(),((List<?>)saved.get("MEMBERS")).size());
        assertEquals(g.toString(),jdbc.queryForObject("SELECT EVIDENCE_JSON FROM BSDPGLNK WHERE ANALYSIS_ID=? AND DRAFT_GROUP_ID=?",String.class,id,gid));
    }
}
