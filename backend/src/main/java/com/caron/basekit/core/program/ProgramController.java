package com.caron.basekit.core.program;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/core/programs")
public class ProgramController {
    private final ProgramService service;
    ProgramController(ProgramService service) { this.service = service; }
    @GetMapping ApiResponse<List<ProgramData>> findPrograms(
            @RequestParam(name="KEYWORD", required=false) String keyword,
            @RequestParam(name="MODULE_CODE", required=false) String moduleCode,
            @RequestParam(name="PROGRAM_TYPE_CODE", required=false) String typeCode,
            @RequestParam(name="USE_YN", required=false) String useYn) {
        return ApiResponse.success(service.findPrograms(keyword, moduleCode, typeCode, useYn));
    }
    @GetMapping("/{id}") ApiResponse<ProgramData> findProgram(@PathVariable String id) { return ApiResponse.success(service.findProgram(id)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) ApiResponse<ProgramData> create(@Valid @RequestBody ProgramSaveRequest request) { return ApiResponse.success(service.createProgram(request)); }
    @PutMapping("/{id}") ApiResponse<ProgramData> update(@PathVariable String id, @Valid @RequestBody ProgramSaveRequest request) { return ApiResponse.success(service.updateProgram(id, request)); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(@PathVariable String id) { service.deleteProgram(id); }
}
