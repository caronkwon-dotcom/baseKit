package com.caron.basekit.core.endpoint;

import com.caron.basekit.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/core/programs/{programId}")
public class EndpointController {
    private final EndpointService service;
    public EndpointController(EndpointService service) { this.service=service; }
    public record GroupsRequest(@NotNull @Size(max=200) List<@NotNull @Valid ButtonGroup> GROUPS) {}
    public record MappingRequest(@Size(max=100) String GROUP_CODE) {}
    @GetMapping("/button-groups") ApiResponse<List<ButtonGroup>> groups(@PathVariable String programId) { return ApiResponse.success(service.groups(programId)); }
    @PutMapping("/button-groups") ApiResponse<List<ButtonGroup>> save(@PathVariable String programId, @Valid @RequestBody GroupsRequest request) { return ApiResponse.success(service.saveGroups(programId,request.GROUPS())); }
    @GetMapping("/endpoints") ApiResponse<List<EndpointData>> endpoints(@PathVariable String programId) { return ApiResponse.success(service.endpoints(programId)); }
    @PutMapping("/endpoints/{endpointId}") ApiResponse<Void> map(@PathVariable String programId,@PathVariable String endpointId,@Valid @RequestBody MappingRequest request) { service.map(programId,endpointId,request.GROUP_CODE()); return ApiResponse.success(null); }
    @DeleteMapping("/endpoints/{endpointId}") ApiResponse<Void> unmap(@PathVariable String programId,@PathVariable String endpointId) { service.unmap(programId,endpointId); return ApiResponse.success(null); }
}
