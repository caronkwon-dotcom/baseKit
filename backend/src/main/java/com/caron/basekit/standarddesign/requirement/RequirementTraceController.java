package com.caron.basekit.standarddesign.requirement;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

/** Read-only trace endpoints. Both need the project, and a requirement of another project is not found. */
@RestController
@RequestMapping("/api/standard-design/requirements")
public class RequirementTraceController {
    private final RequirementTraceService service;

    public RequirementTraceController(RequirementTraceService service) { this.service = service; }

    @GetMapping("/trace-summary")
    ApiResponse<List<Map<String, Object>>> summary(@RequestParam(value = "PROJECT_ID", required = false) String project) { return ApiResponse.success(service.summary(project)); }

    @GetMapping("/{id}/trace")
    ApiResponse<Map<String, Object>> trace(@PathVariable String id, @RequestParam(value = "PROJECT_ID", required = false) String project) { return ApiResponse.success(service.trace(project, id)); }
}
