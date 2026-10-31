package com.caron.basekit.standarddesign.program;
import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/standard-design/projects/{project}/programs")
public class DesignProgramController {
 private final DesignProgramService service;
 public DesignProgramController(DesignProgramService service){this.service=service;}
 @GetMapping public ApiResponse<List<Map<String,Object>>> list(@PathVariable String project){return ApiResponse.success(service.list(project));}
 @PostMapping public ApiResponse<Map<String,Object>> create(@PathVariable String project,@RequestBody DesignProgramService.Edit input){return ApiResponse.success(service.create(project,input));}
 @PutMapping("/{id}") public ApiResponse<Map<String,Object>> edit(@PathVariable String project,@PathVariable String id,@RequestBody DesignProgramService.Edit input){return ApiResponse.success(service.edit(project,id,input));}
 @GetMapping("/candidates") public ApiResponse<List<Map<String,Object>>> candidates(@PathVariable String project,@RequestParam("GROUP_ID") String group,@RequestParam("ANALYSIS_ID") String analysis){return ApiResponse.success(service.candidates(project,group,analysis));}
 @PostMapping("/adoptions") public ApiResponse<List<Map<String,Object>>> adopt(@PathVariable String project,@RequestBody DesignProgramService.Adopt input){return ApiResponse.success(service.adopt(project,input));}
}
