package com.caron.basekit.standarddesign.analysis;

import com.caron.basekit.common.api.ApiResponse;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/standard-design/analyses")
public class AnalysisController {
    private final AnalysisService service;

    AnalysisController(AnalysisService service) { this.service = service; }

    @GetMapping ApiResponse<List<Map<String, Object>>> list(@RequestParam("PROJECT_ID") String projectId) { return ApiResponse.success(service.list(projectId)); }
    @PostMapping @ResponseStatus(HttpStatus.ACCEPTED) ApiResponse<ObjectNode> create(@RequestBody AnalysisService.AnalysisRequest body) { return ApiResponse.success(service.create(body)); }
    @GetMapping("/{id}") ApiResponse<ObjectNode> get(@PathVariable String id) { return ApiResponse.success(service.get(id)); }
    @PutMapping("/{id}/input") ApiResponse<ObjectNode> input(@PathVariable String id, @RequestBody AnalysisService.InputDraft body) { return ApiResponse.success(service.checkInput(id, body)); }
    @PostMapping("/{id}/reanalyze") @ResponseStatus(HttpStatus.ACCEPTED) ApiResponse<ObjectNode> reanalyze(@PathVariable String id, @RequestBody AnalysisService.InputDraft body) { return ApiResponse.success(service.reanalyze(id, body)); }
    @PutMapping("/{id}/candidates/{candidateId}") ApiResponse<ObjectNode> candidate(@PathVariable String id, @PathVariable String candidateId, @RequestBody AnalysisService.CandidateUpdate body) { return ApiResponse.success(service.updateCandidate(id, candidateId, body)); }
    @PostMapping("/{id}/confirm") ApiResponse<ObjectNode> confirm(@PathVariable String id, @RequestBody AnalysisService.ConfirmRequest body) { return ApiResponse.success(service.confirm(id, body)); }
    @PostMapping("/{id}/generate") ApiResponse<ObjectNode> generate(@PathVariable String id, @RequestBody AnalysisService.GenerateRequest body) { return ApiResponse.success(service.generate(id, body)); }
    @GetMapping("/{id}/generation") ApiResponse<ObjectNode> generation(@PathVariable String id) { return ApiResponse.success(service.generation(id)); }
}
