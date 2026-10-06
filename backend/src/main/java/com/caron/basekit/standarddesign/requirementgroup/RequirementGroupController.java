package com.caron.basekit.standarddesign.requirementgroup;
import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequestMapping("/api/standard-design/requirement-groups")
public class RequirementGroupController {
 private final RequirementGroupService service;
 public RequirementGroupController(RequirementGroupService service) { this.service=service; }
 @GetMapping public ApiResponse<List<Map<String,Object>>> list(@RequestParam("PROJECT_ID") String project,@RequestParam(value="REQUIREMENT_ID",required=false) String req) { return ApiResponse.success(service.list(project,req)); }
 @GetMapping("/{id}") public ApiResponse<Map<String,Object>> get(@PathVariable String id) { return ApiResponse.success(service.get(id)); }
 @PostMapping public ApiResponse<Map<String,Object>> create(@RequestBody RequirementGroupService.Save input) { return ApiResponse.success(service.create(input)); }
 @PutMapping("/{id}") public ApiResponse<Map<String,Object>> update(@PathVariable String id,@RequestBody RequirementGroupService.Save input) { return ApiResponse.success(service.update(id,input)); }
 @PostMapping("/{id}/confirm") public ApiResponse<Map<String,Object>> confirm(@PathVariable String id,@RequestBody RequirementGroupService.Version input) { return ApiResponse.success(service.confirm(id,input)); }
 @PostMapping("/{id}/edit") public ApiResponse<Map<String,Object>> edit(@PathVariable String id,@RequestBody RequirementGroupService.Version input) { return ApiResponse.success(service.edit(id,input)); }
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable String id,@RequestParam("VERSION") Long version) { service.delete(id,new RequirementGroupService.Version(version)); }
}
