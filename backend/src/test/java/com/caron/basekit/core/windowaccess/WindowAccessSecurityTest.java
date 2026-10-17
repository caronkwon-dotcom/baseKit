package com.caron.basekit.core.windowaccess;

import com.caron.basekit.core.endpoint.EndpointPermissionProvider;
import com.caron.basekit.core.menuexecution.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WindowAccessSecurityTest {
    @Test void serverValidatesMembershipSettingPrincipalAndTrustedGrant() {
        var catalog=mock(MenuExecutionCatalog.class);
        var settings=mock(MenuExecutionService.class);
        @SuppressWarnings("unchecked") ObjectProvider<EndpointPermissionProvider> providers=mock(ObjectProvider.class);
        var env=new MockEnvironment();
        var controller=new WindowAccessController(catalog,settings,providers,new WindowAccessPolicy(env));
        var request=new MockHttpServletRequest();
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        when(catalog.containsProgram("ROOT","P")).thenReturn(true);
        when(settings.find("ROOT")).thenReturn(new MenuExecutionSetting("ROOT","INNER","BASEKIT"));
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        when(settings.find("ROOT")).thenReturn(new MenuExecutionSetting("ROOT","WINDOW","LINEAR"));
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        var host=mock(EndpointPermissionProvider.class); when(providers.getIfAvailable()).thenReturn(host);
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        request.setUserPrincipal(()->"trusted-user");
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        when(host.hasProgram(request,"P")).thenReturn(true);
        assertEquals("LINEAR",controller.check("ROOT","P",request).DESIGN_TYPE());
        env.setActiveProfiles("dev"); env.setProperty("basekit.window.allow-unauthenticated-development","true");
        when(host.hasProgram(request,"P")).thenReturn(false);
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        when(providers.getIfAvailable()).thenReturn(null);
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
        request.setUserPrincipal(null);
        assertEquals("LINEAR",controller.check("ROOT","P",request).DESIGN_TYPE());
        env.setActiveProfiles("dev","production");
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
    }
}
