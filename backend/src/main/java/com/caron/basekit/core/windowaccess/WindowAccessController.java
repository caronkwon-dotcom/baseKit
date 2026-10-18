package com.caron.basekit.core.windowaccess;

import com.caron.basekit.core.endpoint.EndpointPermissionProvider;
import com.caron.basekit.core.menuexecution.MenuExecutionCatalog;
import com.caron.basekit.core.menuexecution.MenuExecutionService;
import com.caron.basekit.core.menuexecution.MenuExecutionSetting;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/core/window-access")
public class WindowAccessController {
    private final MenuExecutionCatalog catalog;
    private final MenuExecutionService settings;
    private final ObjectProvider<EndpointPermissionProvider> providers;
    private final WindowAccessPolicy policy;
    public WindowAccessController(MenuExecutionCatalog catalog, MenuExecutionService settings,
            ObjectProvider<EndpointPermissionProvider> providers, WindowAccessPolicy policy) {
        this.catalog=catalog; this.settings=settings; this.providers=providers; this.policy=policy;
    }
    @GetMapping
    public MenuExecutionSetting check(@RequestParam("MENU_ID") String menuId,
            @RequestParam("PROGRAM_KEY") String programKey, HttpServletRequest request) {
        if (!catalog.containsProgram(menuId,programKey)) deny();
        var setting=settings.find(menuId);
        if (!"WINDOW".equals(setting.EXECUTION_TYPE())) deny();
        var provider=providers.getIfAvailable();
        // TODO common login: unify INNER/WINDOW authentication and grants. No anonymous production access.
        if (provider==null && policy.developmentEnvironment() && request.getUserPrincipal()==null) return setting;
        if (provider==null || request.getUserPrincipal()==null) {
            deny();
        } else if (!provider.hasProgram(request,programKey)) deny();
        return setting;
    }
    private static void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN,"독립 창 접근 권한이 없습니다."); }
}
