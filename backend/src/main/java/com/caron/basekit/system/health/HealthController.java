package com.caron.basekit.system.health;

import com.caron.basekit.common.api.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final String applicationName;

    public HealthController(@Value("${spring.application.name}") String applicationName) {
        this.applicationName = applicationName;
    }

    @GetMapping
    ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(Map.of(
                "APPLICATION_NAME", applicationName,
                "STATUS", "UP"
        ));
    }
}
