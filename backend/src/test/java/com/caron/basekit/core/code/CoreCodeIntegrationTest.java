package com.caron.basekit.core.code;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoreCodeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void providesSeededCodeGroupsAndCodes() throws Exception {
        mockMvc.perform(get("/api/core/codes/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.length()").value(5));

        mockMvc.perform(get("/api/core/codes").param("CODE_GROUP_ID", "USER_TYPE_CODE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.length()").value(4))
                .andExpect(jsonPath("$.DATA[0].CODE_GROUP_ID").value("USER_TYPE_CODE"));
    }

    @Test
    void performsCodeGroupAndCodeCrudWithLogicalDelete() throws Exception {
        String groupCreate = """
                {"CODE_GROUP_ID":"TEST_TYPE_CODE","CODE_GROUP_NAME":"테스트유형코드",
                 "DESCRIPTION":"통합 테스트", "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes/groups")
                        .contentType(MediaType.APPLICATION_JSON).content(groupCreate))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.CODE_GROUP_ID").value("TEST_TYPE_CODE"));

        String codeCreate = """
                {"CODE_ID":"TEST_TYPE_A","CODE_GROUP_ID":"TEST_TYPE_CODE","CODE":"A",
                 "CODE_NAME":"테스트 A", "SORT_ORDER":1, "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes")
                        .contentType(MediaType.APPLICATION_JSON).content(codeCreate))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.DATA.CODE_NAME").value("테스트 A"));

        String codeUpdate = """
                {"CODE_ID":"TEST_TYPE_A","CODE_GROUP_ID":"TEST_TYPE_CODE","CODE":"A",
                 "CODE_NAME":"테스트 A 수정", "SORT_ORDER":2, "USE_YN":"N"}
                """;
        mockMvc.perform(put("/api/core/codes/TEST_TYPE_A")
                        .contentType(MediaType.APPLICATION_JSON).content(codeUpdate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.DATA.CODE_NAME").value("테스트 A 수정"))
                .andExpect(jsonPath("$.DATA.USE_YN").value("N"));

        mockMvc.perform(delete("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/core/codes/TEST_TYPE_A"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/codes/TEST_TYPE_A"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/core/codes/groups/TEST_TYPE_CODE"))
                .andExpect(status().isNotFound());
    }

    @Test
    void rejectsDuplicateCodeValueWithinGroup() throws Exception {
        String duplicate = """
                {"CODE_ID":"USER_TYPE_INTERNAL_COPY","CODE_GROUP_ID":"USER_TYPE_CODE","CODE":"INTERNAL",
                 "CODE_NAME":"중복", "SORT_ORDER":99, "USE_YN":"Y"}
                """;
        mockMvc.perform(post("/api/core/codes")
                        .contentType(MediaType.APPLICATION_JSON).content(duplicate))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.ERROR_CODE").value("CORE_CODE_CONFLICT"));
    }
}
