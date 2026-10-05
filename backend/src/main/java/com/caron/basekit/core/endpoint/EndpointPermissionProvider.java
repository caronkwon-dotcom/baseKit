package com.caron.basekit.core.endpoint;

import jakarta.servlet.http.HttpServletRequest;

/** Host authentication supplies trusted grants; never infer grants from caller headers. */
public interface EndpointPermissionProvider {
    boolean hasProgram(HttpServletRequest request, String programKey);
    boolean hasButtonGroup(HttpServletRequest request, String programKey, String groupCode);
}
