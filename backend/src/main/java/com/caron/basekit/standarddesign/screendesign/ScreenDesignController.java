package com.caron.basekit.standarddesign.screendesign;

import com.caron.basekit.common.api.ApiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/standard-design/projects/{project}")
public class ScreenDesignController {
    private final ScreenDesignService service;
    private final ScreenDesignAiService ai;

    public ScreenDesignController(ScreenDesignService service, ScreenDesignAiService ai) { this.service = service; this.ai = ai; }

    /** Status per program for the list screen; programs without a design are simply absent. */
    @GetMapping("/screen-designs")
    public ApiResponse<List<Map<String, Object>>> summaries(@PathVariable String project) { return ApiResponse.success(service.summaries(project)); }

    /** DATA is null when the program has no design yet. */
    @GetMapping("/programs/{programId}/screen-design")
    public ApiResponse<Map<String, Object>> get(@PathVariable String project, @PathVariable String programId) { return ApiResponse.success(service.get(project, programId)); }

    @PutMapping("/programs/{programId}/screen-design")
    public ApiResponse<Map<String, Object>> save(@PathVariable String project, @PathVariable String programId, @RequestBody JsonNode request) { return ApiResponse.success(service.save(project, programId, request)); }

    @PostMapping("/programs/{programId}/screen-design/confirm")
    public ApiResponse<Map<String, Object>> confirm(@PathVariable String project, @PathVariable String programId, @RequestBody JsonNode request) {
        return ApiResponse.success(service.confirm(project, programId, request.hasNonNull("VERSION") && request.get("VERSION").isIntegralNumber() ? request.get("VERSION").asLong() : null));
    }

    /** Returns a validated draft only; nothing is stored until the user saves. */
    @PostMapping("/programs/{programId}/screen-design/ai-draft")
    public ApiResponse<Map<String, Object>> aiDraft(@PathVariable String project, @PathVariable String programId) { return ApiResponse.success(ai.draft(project, programId)); }
}
