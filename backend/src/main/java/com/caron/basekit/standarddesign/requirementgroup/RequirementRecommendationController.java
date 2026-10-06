package com.caron.basekit.standarddesign.requirementgroup;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/standard-design/requirement-recommendations")
public class RequirementRecommendationController {
    private final RequirementRecommendationService service;
    public RequirementRecommendationController(RequirementRecommendationService service) { this.service = service; }
    @GetMapping public ApiResponse<List<RequirementRecommendationService.Result>> list(@RequestParam("PROJECT_ID") String projectId) {
        return ApiResponse.success(service.list(projectId));
    }
    @GetMapping("/{id}") public ApiResponse<RequirementRecommendationService.Result> get(@PathVariable String id) {
        return ApiResponse.success(service.get(id));
    }
    @RequestMapping(value="/{id}", method={RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE})
    public void immutable(@PathVariable String id) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED, "완료된 추천 실행은 수정하거나 삭제할 수 없습니다.");
    }
    @PostMapping public ApiResponse<RequirementRecommendationService.Result> save(@RequestBody RequirementRecommendationService.SaveRequest request) {
        return ApiResponse.success(service.save(request));
    }
}
