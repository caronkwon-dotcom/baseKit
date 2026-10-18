package com.caron.basekit.core.windowaccess;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Component
public class WindowAccessPolicy {
    private final Environment environment;
    public WindowAccessPolicy(Environment environment) { this.environment = environment; }
    public boolean developmentEnvironment() {
        var profiles = Arrays.asList(environment.getActiveProfiles());
        return !profiles.contains("prod") && !profiles.contains("production")
                && (profiles.contains("common") || profiles.contains("dev") || profiles.contains("local") || profiles.contains("test"));
    }
}
