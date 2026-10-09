package com.caron.basekit.standarddesign.requirementgroup;
import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/standard-design/requirement-groups/{group}/analyses")
public class RequirementGroupAnalysisController {
 private final RequirementGroupAnalysisService service;
 public RequirementGroupAnalysisController(RequirementGroupAnalysisService service) { this.service=service; }
 @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED) public ApiResponse<Map<String,Object>> execute(@PathVariable String group,@RequestBody RequirementGroupAnalysisService.Execute request) { return ApiResponse.success(service.execute(group,request)); }
 @GetMapping public ApiResponse<List<Map<String,Object>>> list(@PathVariable String group) { return ApiResponse.success(service.list(group)); }
 @GetMapping("/{id}") public ApiResponse<Map<String,Object>> get(@PathVariable String group,@PathVariable String id) { return ApiResponse.success(service.get(group,id)); }
}
