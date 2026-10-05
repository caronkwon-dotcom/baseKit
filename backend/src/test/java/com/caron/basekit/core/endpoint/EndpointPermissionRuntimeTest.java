package com.caron.basekit.core.endpoint;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class EndpointPermissionRuntimeTest {
    @Autowired MockMvc mvc;
    @Autowired EndpointService service;
    @MockitoBean EndpointPermissionProvider permissions;
    @Test void enforcesTrustedProgramAndGroupButLeavesUnmappedAlone() throws Exception {
        var endpoint=service.endpoints("PROGRAM_MGMT").stream()
                .filter(e -> e.PATH().equals("/api/core/programs") && e.HTTP_METHOD().equals("GET")).findFirst().orElseThrow();
        service.saveGroups("PROGRAM_MGMT",List.of(new ButtonGroup("COMMON.DELETE","COMMON","삭제","","Y")));
        try {
            mvc.perform(get("/api/core/programs")).andExpect(status().isOk());
            service.map("PROGRAM_MGMT",endpoint.ENDPOINT_ID(),null);
            mvc.perform(get("/api/core/programs")).andExpect(status().isForbidden());
            when(permissions.hasProgram(any(),eq("PROGRAM_MGMT"))).thenReturn(true);
            mvc.perform(get("/api/core/programs")).andExpect(status().isOk());
            mvc.perform(head("/api/core/programs")).andExpect(status().isOk());
            service.map("PROGRAM_MGMT",endpoint.ENDPOINT_ID(),"COMMON.DELETE");
            mvc.perform(get("/api/core/programs")).andExpect(status().isForbidden());
            when(permissions.hasButtonGroup(any(),eq("PROGRAM_MGMT"),eq("COMMON.DELETE"))).thenReturn(true);
            mvc.perform(get("/api/core/programs")).andExpect(status().isOk());
            service.saveGroups("PROGRAM_MGMT",List.of(new ButtonGroup("COMMON.DELETE","COMMON","삭제","","N")));
            mvc.perform(get("/api/core/programs")).andExpect(status().isForbidden());
            service.unmap("PROGRAM_MGMT",endpoint.ENDPOINT_ID());
            mvc.perform(get("/api/core/programs")).andExpect(status().isOk());
        } finally { service.unmap("PROGRAM_MGMT",endpoint.ENDPOINT_ID()); service.saveGroups("PROGRAM_MGMT",List.of()); }
    }
}
