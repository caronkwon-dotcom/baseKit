package com.caron.basekit.core.endpoint;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class EndpointIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired EndpointService service;
    @Autowired EndpointCollector collector;
    @Test void retainsRemovedEndpointsAsStaleAndRevivesCollectedEndpoints() {
        var removed = new EndpointData("retired-test-endpoint","GET","/retired","RetiredController","retired","ACTIVE","UNMAPPED",null);
        service.collect(List.of(removed));
        collector.collect();
        var rows=service.endpoints("PROGRAM_MGMT");
        assertEquals("STALE",rows.stream().filter(e->e.ENDPOINT_ID().equals(removed.ENDPOINT_ID())).findFirst().orElseThrow().COLLECTION_STATUS());
        assertTrue(rows.stream().anyMatch(e->e.PATH().equals("/api/core/programs") && e.COLLECTION_STATUS().equals("ACTIVE")));
    }
    @Test void collectsMappingsAndPersistsGroupsWithSharedEndpointAndValidation() throws Exception {
        var endpoint=service.endpoints("PROGRAM_MGMT").stream()
                .filter(e -> e.PATH().equals("/api/core/programs") && e.HTTP_METHOD().equals("GET")).findFirst().orElseThrow();
        assertEquals("ACTIVE",endpoint.COLLECTION_STATUS());
        assertTrue(endpoint.CONTROLLER_CLASS().endsWith("ProgramController"));
        String path="/api/core/programs/PROGRAM_MGMT";
        String groups="""
                {"GROUPS":[{"GROUP_CODE":"CUSTOM.APPROVE","GROUP_TYPE":"CUSTOM","GROUP_NAME":"승인","DESCRIPTION":"승인 그룹","USE_YN":"Y"}]}
                """;
        try {
            mvc.perform(put(path+"/button-groups").contentType(MediaType.APPLICATION_JSON).content(groups))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.DATA[0].GROUP_CODE").value("CUSTOM.APPROVE"));
            mvc.perform(put(path+"/endpoints/"+endpoint.ENDPOINT_ID()).contentType(MediaType.APPLICATION_JSON).content("{\"GROUP_CODE\":\"CUSTOM.APPROVE\"}"))
                    .andExpect(status().isOk());
            service.map("COMMON_CODE_MGMT",endpoint.ENDPOINT_ID(),null);
            collector.collect(); // Recollection is idempotent and preserves management mappings.
            assertEquals("CUSTOM.APPROVE",service.endpoints("PROGRAM_MGMT").stream().filter(e->e.ENDPOINT_ID().equals(endpoint.ENDPOINT_ID())).findFirst().orElseThrow().GROUP_CODE());
            assertEquals("MAPPED",service.endpoints("COMMON_CODE_MGMT").stream().filter(e->e.ENDPOINT_ID().equals(endpoint.ENDPOINT_ID())).findFirst().orElseThrow().MAPPING_STATUS());
            mvc.perform(put(path+"/button-groups").contentType(MediaType.APPLICATION_JSON).content("{\"GROUPS\":[]}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(put(path+"/button-groups").contentType(MediaType.APPLICATION_JSON).content(groups.replace("CUSTOM.APPROVE","COMMON.APPROVE")))
                    .andExpect(status().isBadRequest());
            mvc.perform(put(path+"/endpoints/"+endpoint.ENDPOINT_ID()).contentType(MediaType.APPLICATION_JSON).content("{\"GROUP_CODE\":\"COMMON.MISSING\"}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(put(path+"/endpoints/missing").contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isNotFound());
            mvc.perform(get(path+"/endpoints")).andExpect(status().isOk());
            mvc.perform(get("/api/core/programs/missing/endpoints")).andExpect(status().isNotFound());
        } finally {
            service.unmap("PROGRAM_MGMT",endpoint.ENDPOINT_ID());
            service.unmap("COMMON_CODE_MGMT",endpoint.ENDPOINT_ID());
            service.saveGroups("PROGRAM_MGMT",List.of());
        }
        assertEquals("UNMAPPED",service.endpoints("PROGRAM_MGMT").stream().filter(e->e.ENDPOINT_ID().equals(endpoint.ENDPOINT_ID())).findFirst().orElseThrow().MAPPING_STATUS());
        // No default-deny for UNMAPPED.
        mvc.perform(get("/api/core/programs")).andExpect(status().isOk());
    }
}
