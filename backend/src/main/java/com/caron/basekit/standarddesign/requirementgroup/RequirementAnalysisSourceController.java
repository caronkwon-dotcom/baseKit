package com.caron.basekit.standarddesign.requirementgroup;
import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/standard-design/requirement-analysis-sources")
public class RequirementAnalysisSourceController {
 private final RequirementAnalysisSourceService service;
 public RequirementAnalysisSourceController(RequirementAnalysisSourceService service) {this.service=service;}
 @GetMapping public ApiResponse<List<RequirementRecommendationService.Result>> list(@RequestParam("PROJECT_ID") String project) {return ApiResponse.success(service.list(project));}
 @GetMapping("/{id}") public ApiResponse<RequirementRecommendationService.Result> get(@PathVariable String id) {return ApiResponse.success(service.get(id));}
}
