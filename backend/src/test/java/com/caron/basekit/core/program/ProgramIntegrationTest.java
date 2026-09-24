package com.caron.basekit.core.program;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class ProgramIntegrationTest {
    @Autowired MockMvc mockMvc;
    private static final String CREATE = """
      {"PROGRAM_ID":"TEST_PROGRAM","PROGRAM_KEY":"TEST_PROGRAM_KEY","PROGRAM_NAME":"테스트 프로그램",
       "MODULE_CODE":"SYSTEM","PROGRAM_TYPE_CODE":"GRID","ROUTE":"/test/program","DESCRIPTION":"테스트","USE_YN":"Y"}
      """;
    @Test void providesSeedAndCrudWithDuplicateValidationAndLogicalDelete() throws Exception {
        mockMvc.perform(get("/api/core/programs").param("MODULE_CODE","SYSTEM"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(6)));
        mockMvc.perform(post("/api/core/programs").contentType(MediaType.APPLICATION_JSON).content(CREATE))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.DATA.PROGRAM_KEY").value("TEST_PROGRAM_KEY"));
        mockMvc.perform(post("/api/core/programs").contentType(MediaType.APPLICATION_JSON).content(CREATE))
                .andExpect(status().isConflict());
        String update = CREATE.replace("테스트 프로그램", "테스트 프로그램 수정").replace("\"USE_YN\":\"Y\"", "\"USE_YN\":\"N\"");
        mockMvc.perform(put("/api/core/programs/TEST_PROGRAM").contentType(MediaType.APPLICATION_JSON).content(update))
                .andExpect(status().isOk()).andExpect(jsonPath("$.DATA.PROGRAM_NAME").value("테스트 프로그램 수정"));
        mockMvc.perform(delete("/api/core/programs/TEST_PROGRAM")).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/programs/TEST_PROGRAM")).andExpect(status().isNotFound());
    }
}
