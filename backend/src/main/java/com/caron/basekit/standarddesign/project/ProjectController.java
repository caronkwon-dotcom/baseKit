package com.caron.basekit.standarddesign.project;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/standard-design/projects")
public class ProjectController {
 private final ProjectService service;
 public ProjectController(ProjectService service) { this.service = service; }

 @GetMapping public ApiResponse<List<Map<String, Object>>> list() { return ApiResponse.success(service.list()); }
 @GetMapping("/{id}") public ApiResponse<Map<String, Object>> get(@PathVariable String id) { return ApiResponse.success(service.get(id)); }
 @PostMapping public ApiResponse<Map<String, Object>> create(@RequestBody ProjectService.Input input) { return ApiResponse.success(service.create(input)); }
 @PutMapping("/{id}") public ApiResponse<Map<String, Object>> update(@PathVariable String id, @RequestBody ProjectService.Input input) { return ApiResponse.success(service.update(id, input)); }
 @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable String id, @RequestParam("VERSION") Long version) { service.delete(id, version); return ApiResponse.success(null); }
}
