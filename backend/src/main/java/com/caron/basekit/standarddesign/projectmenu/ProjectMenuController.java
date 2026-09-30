package com.caron.basekit.standarddesign.projectmenu;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/standard-design/project-menus")
public class ProjectMenuController {
    private final ProjectMenuService service;
    ProjectMenuController(ProjectMenuService service) { this.service = service; }
    @GetMapping ApiResponse<ProjectMenuPageData> page(@RequestParam("PROJECT_ID") String projectId) { return ApiResponse.success(service.page(projectId)); }
    @PutMapping("/mode") ApiResponse<ProjectMenuPageData> mode(@Valid @RequestBody ProjectMenuModeRequest request) { return ApiResponse.success(service.setMode(request)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) ApiResponse<ProjectMenuData> create(@Valid @RequestBody ProjectMenuSaveRequest request) { return ApiResponse.success(service.create(request)); }
    @PutMapping("/{id}") ApiResponse<ProjectMenuData> update(@PathVariable String id, @Valid @RequestBody ProjectMenuSaveRequest request) { return ApiResponse.success(service.update(id, request)); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable String id) { service.delete(id); }
}
