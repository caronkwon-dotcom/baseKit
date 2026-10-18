package com.caron.basekit.standarddesign.projectmenu;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProjectReferenceControllerTest {
    @Test
    void listsProjectIdsFromExistingRequirementRowsWithoutChangingData() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(org.mockito.ArgumentMatchers.eq("SELECT DISTINCT PROJECT_ID FROM BSDRREQ ORDER BY PROJECT_ID"),
                org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<ProjectReferenceController.ProjectReference>>any()))
                .thenReturn(List.of(new ProjectReferenceController.ProjectReference("SDP-001"),
                        new ProjectReferenceController.ProjectReference("SDP-LATEST")));

        var response = new ProjectReferenceController(jdbc).list();

        assertEquals(List.of("SDP-001", "SDP-LATEST"), response.DATA().stream().map(ProjectReferenceController.ProjectReference::PROJECT_ID).toList());
    }
}
