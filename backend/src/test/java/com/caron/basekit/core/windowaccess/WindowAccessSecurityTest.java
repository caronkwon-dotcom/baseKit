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
    @Test void bypassRequiresExplicitDevelopmentAndCannotLeakIntoProduction() {
        var env=new MockEnvironment().withProperty("basekit.window.allow-unauthenticated-development","true");
        var policy=new WindowAccessPolicy(env);
        assertFalse(policy.developmentWindowBypass());
        env.setActiveProfiles("test"); assertFalse(policy.developmentWindowBypass());
        env.setActiveProfiles("dev"); assertTrue(policy.developmentWindowBypass());
        env.setActiveProfiles("dev","prod"); assertFalse(policy.developmentWindowBypass());
        env.setActiveProfiles("local","production"); assertFalse(policy.developmentEnvironment());
        env.setActiveProfiles("local"); env.setProperty("basekit.window.allow-unauthenticated-development","false");
        assertFalse(policy.developmentWindowBypass());
    }
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
        assertEquals("WINDOW",controller.check("ROOT","P",request).EXECUTION_TYPE());
        env.setActiveProfiles("dev","production");
        assertThrows(ResponseStatusException.class,()->controller.check("ROOT","P",request));
    }
}
