package com.caron.basekit.core.database;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/core/database")
public class CoreDatabaseStatusController {

    private final CoreDatabaseStatusService statusService;

    public CoreDatabaseStatusController(CoreDatabaseStatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping("/status")
    ApiResponse<CoreDatabaseStatus> status() {
        return ApiResponse.success(statusService.getStatus());
    }
}
