package com.caron.basekit.core.windowaccess;

import com.caron.basekit.core.endpoint.EndpointPermissionProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles({"test","production"})
class ProductionApiPermissionTest {
    @Autowired MockMvc mvc;
    @Autowired com.caron.basekit.core.endpoint.EndpointService endpoints;
    @MockitoBean EndpointPermissionProvider host;
    @Test void principalAndExplicitEndpointGrantsAreRequired() throws Exception {
        when(host.hasProgram(any(),anyString())).thenReturn(true);
        mvc.perform(get("/api/core/programs")).andExpect(status().isForbidden());
        mvc.perform(get("/api/core/programs").principal(()->"user")).andExpect(status().isForbidden());
        var endpoint=endpoints.endpoints("PROGRAM_MGMT").stream()
                .filter(e -> e.PATH().equals("/api/core/programs") && e.HTTP_METHOD().equals("GET")).findFirst().orElseThrow();
        try {
            endpoints.map("PROGRAM_MGMT",endpoint.ENDPOINT_ID(),null);
            mvc.perform(get("/api/core/programs").principal(()->"user")).andExpect(status().isOk());
        } finally { endpoints.unmap("PROGRAM_MGMT",endpoint.ENDPOINT_ID()); }
    }
}
