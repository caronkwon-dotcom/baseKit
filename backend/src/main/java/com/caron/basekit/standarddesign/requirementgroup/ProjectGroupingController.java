package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.common.api.ApiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/standard-design/projects/{project}/grouping")
public class ProjectGroupingController {
    private final ProjectGroupingService service;
    public ProjectGroupingController(ProjectGroupingService service) { this.service = service; }
    public record Start(String REQUEST_ID) { }
    public record Edit(Long VERSION, JsonNode DRAFT) { }
    public record Register(Long VERSION, List<String> GROUP_IDS) { }
    @GetMapping public ApiResponse<?> history(@PathVariable String project) { return ApiResponse.success(service.history(project)); }
    @PostMapping public ApiResponse<?> start(@PathVariable String project, @RequestBody Start body) { return ApiResponse.success(service.start(project, body.REQUEST_ID())); }
    @GetMapping("/{id}") public ApiResponse<?> get(@PathVariable String project, @PathVariable String id) { return ApiResponse.success(service.get(project, id)); }
    @PutMapping("/{id}") public ApiResponse<?> save(@PathVariable String project, @PathVariable String id, @RequestBody Edit body) { return ApiResponse.success(service.save(project, id, body.VERSION(), body.DRAFT())); }
    @PostMapping("/{id}/register") public ApiResponse<?> register(@PathVariable String project, @PathVariable String id, @RequestBody Register body) { return ApiResponse.success(service.register(project, id, body.VERSION(), body.GROUP_IDS())); }
}
