package com.caron.basekit.core.endpoint;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class EndpointPermissionPolicyTest {
    @Test void requiresProgramAndOptionalGroupWithCompleteSharedGrant() {
        var ordinary=List.of(new EndpointMapper.EndpointGrant("A",null,"Y"));
        assertTrue(EndpointPermissionPolicy.allowed(List.of(),p->false,(p,g)->false));
        assertTrue(EndpointPermissionPolicy.allowed(ordinary,p->true,(p,g)->false));
        assertFalse(EndpointPermissionPolicy.allowed(ordinary,p->false,(p,g)->true));
        var restricted=List.of(new EndpointMapper.EndpointGrant("A","COMMON.DELETE","Y"));
        assertFalse(EndpointPermissionPolicy.allowed(restricted,p->true,(p,g)->false));
        assertFalse(EndpointPermissionPolicy.allowed(restricted,p->false,(p,g)->true));
        assertTrue(EndpointPermissionPolicy.allowed(restricted,p->true,(p,g)->true));
        var shared=List.of(new EndpointMapper.EndpointGrant("A","CUSTOM.APPROVE","Y"),new EndpointMapper.EndpointGrant("B","COMMON.DELETE","Y"));
        assertFalse(EndpointPermissionPolicy.allowed(shared,p->p.equals("A"),(p,g)->p.equals("B")));
        assertTrue(EndpointPermissionPolicy.allowed(shared,p->p.equals("B"),(p,g)->p.equals("B")));
        assertFalse(EndpointPermissionPolicy.allowed(List.of(new EndpointMapper.EndpointGrant("A",null,"N")),p->true,(p,g)->true));
    }
}
