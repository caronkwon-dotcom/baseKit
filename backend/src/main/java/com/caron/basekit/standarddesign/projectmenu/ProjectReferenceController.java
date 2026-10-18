package com.caron.basekit.standarddesign.projectmenu;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/standard-design/projects")
public class ProjectReferenceController {
    private final JdbcTemplate jdbc;

    ProjectReferenceController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    ApiResponse<List<ProjectReference>> list() {
        var projects = jdbc.query("SELECT DISTINCT PROJECT_ID FROM BSDRREQ ORDER BY PROJECT_ID",
                (rs, row) -> new ProjectReference(rs.getString("PROJECT_ID")));
        return ApiResponse.success(projects);
    }

    public record ProjectReference(String PROJECT_ID) { }
}
